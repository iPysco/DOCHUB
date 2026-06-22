import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Circle, Copy, MessageSquareText, X } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { CircularStat } from "@/components/CircularStat";
import { useStore } from "@/lib/store";
import {
  calcularAtrasos,
  calcularPendentes,
  montarTextoCobranca,
  type AtrasoTipo,
} from "@/lib/cobranca";
import type {
  Analista,
  DocumentoStatus,
  Empresa,
  TipoDocumento,
} from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel | DocHub" },
      {
        name: "description",
        content: "Painel de gestão de documentos contábeis.",
      },
    ],
  }),
  component: Painel,
});

type SortMode = "maior" | "menor" | "az" | "za";
type DispensaPeriodo = "hoje" | "ontem" | "semana" | "mes" | "ano" | "todos";

function Painel() {
  const empresasAll = useStore((s) => s.empresas);
  const tipos = useStore((s) => s.tipos);
  const documentos = useStore((s) => s.documentos);
  const analistas = useStore((s) => s.analistas);

  const [analistaFiltro, setAnalistaFiltro] = useState<string>("");
  const [cobrancaEmpresaId, setCobrancaEmpresaId] = useState<string | null>(
    null,
  );
  const [sortMode, setSortMode] = useState<SortMode>("maior");
  const [dispPeriodo, setDispPeriodo] = useState<DispensaPeriodo>("todos");
  const [dispEmpresaId, setDispEmpresaId] = useState<string | null>(null);

  const empresas = useMemo(
    () =>
      analistaFiltro
        ? empresasAll.filter((e) => e.analistaId === analistaFiltro)
        : empresasAll,
    [empresasAll, analistaFiltro],
  );

  // Em atraso
  const empresasComAtraso = useMemo(() => {
    const lista = empresas
      .map((e) => ({ empresa: e, itens: calcularAtrasos(e, tipos, documentos) }))
      .filter((x) => x.itens.length > 0);
    const totalAtraso = (xs: AtrasoTipo[]) =>
      xs.reduce((a, i) => a + i.periodos.length, 0);
    const ord = [...lista];
    if (sortMode === "maior") {
      ord.sort((a, b) => totalAtraso(b.itens) - totalAtraso(a.itens));
    } else if (sortMode === "menor") {
      ord.sort((a, b) => totalAtraso(a.itens) - totalAtraso(b.itens));
    } else if (sortMode === "az") {
      ord.sort((a, b) => a.empresa.nome.localeCompare(b.empresa.nome));
    } else {
      ord.sort((a, b) => b.empresa.nome.localeCompare(a.empresa.nome));
    }
    return ord;
  }, [empresas, tipos, documentos, sortMode]);

  // Pendentes
  const empresasComPendente = useMemo(() => {
    return empresas
      .map((e) => ({
        empresa: e,
        itens: calcularPendentes(e, tipos, documentos),
      }))
      .filter((x) => x.itens.length > 0);
  }, [empresas, tipos, documentos]);

  // Dispensados filtrados por data
  const dispensadosFiltrados = useMemo(() => {
    const empresaIds = new Set(empresas.map((e) => e.id));
    const docs = documentos.filter(
      (d) => d.status === "dispensado" && empresaIds.has(d.empresaId),
    );
    const now = new Date();
    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(now);
    const inRange = (iso?: string) => {
      if (dispPeriodo === "todos") return true;
      if (!iso) return false;
      const dt = new Date(iso);
      if (dispPeriodo === "hoje") return dt >= today;
      if (dispPeriodo === "ontem") {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return dt >= y && dt < today;
      }
      if (dispPeriodo === "semana") {
        const s = new Date(today);
        s.setDate(s.getDate() - 7);
        return dt >= s;
      }
      if (dispPeriodo === "mes") {
        const s = new Date(today);
        s.setMonth(s.getMonth() - 1);
        return dt >= s;
      }
      if (dispPeriodo === "ano") {
        const s = new Date(today);
        s.setFullYear(s.getFullYear() - 1);
        return dt >= s;
      }
      return true;
    };
    const aceitos = docs.filter((d) => inRange(d.dispensadoEm));
    // agrupa por empresa
    const map = new Map<string, DocumentoStatus[]>();
    for (const d of aceitos) {
      const arr = map.get(d.empresaId) ?? [];
      arr.push(d);
      map.set(d.empresaId, arr);
    }
    return Array.from(map.entries())
      .map(([empresaId, docsEmp]) => {
        const empresa = empresas.find((e) => e.id === empresaId)!;
        return { empresa, docs: docsEmp };
      })
      .filter((x) => x.empresa);
  }, [empresas, documentos, dispPeriodo]);

  const stats = useMemo(() => {
    const empresaIds = new Set(empresas.map((e) => e.id));
    const atrasado = empresasComAtraso.reduce(
      (acc, x) => acc + x.itens.reduce((a, i) => a + i.periodos.length, 0),
      0,
    );
    const pendente = empresasComPendente.reduce(
      (acc, x) => acc + x.itens.reduce((a, i) => a + i.periodos.length, 0),
      0,
    );
    const recebido = documentos.filter(
      (d) => d.status === "recebido" && empresaIds.has(d.empresaId),
    ).length;
    const dispensado = documentos.filter(
      (d) => d.status === "dispensado" && empresaIds.has(d.empresaId),
    ).length;
    const totalDocs = atrasado + pendente + recebido + dispensado;
    return {
      empresas: empresas.length,
      totalDocs,
      pendente,
      atrasado,
      dispensado,
    };
  }, [empresas, empresasComAtraso, empresasComPendente, documentos]);

  const empresaCobranca = empresas.find((e) => e.id === cobrancaEmpresaId);
  const atrasosCobranca = empresaCobranca
    ? calcularAtrasos(empresaCobranca, tipos, documentos)
    : [];
  const textoCobranca = useMemo(
    () => montarTextoCobranca(atrasosCobranca),
    [atrasosCobranca],
  );

  const empresaDisp = dispensadosFiltrados.find(
    (x) => x.empresa.id === dispEmpresaId,
  );

  return (
    <AppLayout>
      <PageHeader
        title="Painel"
        description="Visão geral de todas as competências"
        actions={
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Analista:</label>
            <select
              value={analistaFiltro}
              onChange={(e) => setAnalistaFiltro(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-card text-sm"
            >
              <option value="">Todos</option>
              {analistas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="bg-primary min-h-[calc(100vh-89px)] p-8 space-y-6 text-primary-foreground">
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="bg-card text-foreground px-4 py-2 rounded-md">
            <span className="text-muted-foreground">Empresas: </span>
            <span className="font-semibold">{stats.empresas}</span>
          </div>
          <div className="bg-card text-foreground px-4 py-2 rounded-md">
            <span className="text-muted-foreground">Documentos: </span>
            <span className="font-semibold">{stats.totalDocs}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CircularStat
            label="Pendente"
            value={stats.pendente}
            total={stats.totalDocs}
            tone="pending"
            empresaCount={empresasComPendente.length}
          />
          <CircularStat
            label="Atrasado"
            value={stats.atrasado}
            total={stats.totalDocs}
            tone="overdue"
            empresaCount={empresasComAtraso.length}
          />
          <CircularStat
            label="Dispensado"
            value={stats.dispensado}
            total={stats.totalDocs}
            tone="validated"
            empresaCount={dispensadosFiltrados.length}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <KanbanColumn
            title="EM ATRASO"
            countTone="overdue"
            empty="Nenhuma empresa com documentos em atraso."
            items={empresasComAtraso}
            analistas={analistas}
            onCobranca={(id) => setCobrancaEmpresaId(id)}
            header={
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="text-xs px-2 py-1 rounded-md border border-input bg-background"
                title="Ordenar por"
              >
                <option value="maior">Maior atraso</option>
                <option value="menor">Menor atraso</option>
                <option value="az">Alfabética (A-Z)</option>
                <option value="za">Alfabética (Z-A)</option>
              </select>
            }
          />
          <KanbanColumn
            title="PENDENTE"
            countTone="pending"
            empty="Nenhum documento pendente no período."
            items={empresasComPendente}
            analistas={analistas}
            onCobranca={(id) => setCobrancaEmpresaId(id)}
          />
          <DispensadoColumn
            items={dispensadosFiltrados}
            analistas={analistas}
            tipos={tipos}
            periodo={dispPeriodo}
            onPeriodo={setDispPeriodo}
            onSelect={(id) => setDispEmpresaId(id)}
          />
        </div>
      </div>

      {empresaCobranca && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-card text-foreground rounded-xl border border-border w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Texto de cobrança</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {empresaCobranca.nome} • {atrasosCobranca.length} documento(s)
                  em atraso
                </p>
              </div>
              <button
                onClick={() => setCobrancaEmpresaId(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-6">
              <textarea
                readOnly
                value={textoCobranca}
                rows={14}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono resize-none"
              />
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setCobrancaEmpresaId(null)}
                className="px-4 py-2 rounded-md border border-input text-sm hover:bg-muted"
              >
                Fechar
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(textoCobranca)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <Copy className="size-4" /> Copiar texto
              </button>
            </div>
          </div>
        </div>
      )}

      {empresaDisp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-card text-foreground rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Documentos dispensados</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {empresaDisp.empresa.nome} • {empresaDisp.docs.length}{" "}
                  documento(s)
                </p>
              </div>
              <button
                onClick={() => setDispEmpresaId(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {empresaDisp.docs.map((d) => {
                const tipo = tipos.find((t) => t.id === d.tipoId);
                return (
                  <div
                    key={d.id}
                    className="border border-border rounded-lg p-3 bg-background"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">
                        {tipo?.nome ?? "—"}{" "}
                        <span className="text-muted-foreground font-normal">
                          ({d.periodo})
                        </span>
                      </div>
                      {d.dispensadoEm && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(d.dispensadoEm).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="text-xs font-medium text-muted-foreground">
                        Justificativa:{" "}
                      </span>
                      {d.justificativa || (
                        <span className="text-muted-foreground italic">
                          (não informada)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function KanbanColumn({
  title,
  countTone,
  empty,
  items,
  analistas,
  onCobranca,
  header,
}: {
  title: string;
  countTone: "overdue" | "pending";
  empty: string;
  items: { empresa: Empresa; itens: AtrasoTipo[] }[];
  analistas: Analista[];
  onCobranca: (empresaId: string) => void;
  header?: React.ReactNode;
}) {
  return (
    <div className="bg-card text-foreground rounded-xl border border-border overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
        <h2 className="font-semibold flex items-center gap-2">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: `var(--color-${countTone})` }}
          />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {header}
          <span className="text-xs text-muted-foreground">
            {items.length} empresa(s)
          </span>
        </div>
      </div>
      <div className="p-4 space-y-3 max-h-[640px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10">
            {empty}
          </div>
        ) : (
          items.map(({ empresa, itens }) => {
            const analista = analistas.find((a) => a.id === empresa.analistaId);
            return (
              <div
                key={empresa.id}
                className="border border-border rounded-lg p-3 bg-background hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-2">
                  <Circle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <Link
                    to="/empresas/$id"
                    params={{ id: empresa.id }}
                    className="font-medium text-sm text-foreground hover:text-primary hover:underline truncate"
                  >
                    {empresa.nome}
                  </Link>
                </div>
                <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
                  {analista && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200">
                      {analista.nome}
                    </span>
                  )}
                  {itens.map((it) => {
                    const muitos = it.periodos.length > 6;
                    return (
                      <span
                        key={it.tipoId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-sky-50 text-sky-900 border border-sky-200"
                        title={it.periodos.join(", ")}
                      >
                        {it.tipoNome}
                        {muitos && (
                          <span
                            className="text-yellow-500"
                            title={`${it.periodos.length} períodos em atraso`}
                          >
                            ⚠
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-3 ml-6 flex justify-end">
                  <button
                    onClick={() => onCobranca(empresa.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                  >
                    <MessageSquareText className="size-3.5" />
                    Gerar cobrança
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DispensadoColumn({
  items,
  analistas,
  tipos,
  periodo,
  onPeriodo,
  onSelect,
}: {
  items: { empresa: Empresa; docs: DocumentoStatus[] }[];
  analistas: Analista[];
  tipos: TipoDocumento[];
  periodo: DispensaPeriodo;
  onPeriodo: (p: DispensaPeriodo) => void;
  onSelect: (empresaId: string) => void;
}) {
  return (
    <div className="bg-card text-foreground rounded-xl border border-border overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
        <h2 className="font-semibold flex items-center gap-2">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: "var(--color-validated)" }}
          />
          DISPENSADO
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={periodo}
            onChange={(e) => onPeriodo(e.target.value as DispensaPeriodo)}
            className="text-xs px-2 py-1 rounded-md border border-input bg-background"
            title="Filtrar por data"
          >
            <option value="todos">Todos</option>
            <option value="hoje">Hoje</option>
            <option value="ontem">Ontem</option>
            <option value="semana">Semana passada</option>
            <option value="mes">Mês passado</option>
            <option value="ano">Ano passado</option>
          </select>
          <span className="text-xs text-muted-foreground">
            {items.length} empresa(s)
          </span>
        </div>
      </div>
      <div className="p-4 space-y-3 max-h-[640px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10">
            Nenhum documento dispensado no período.
          </div>
        ) : (
          items.map(({ empresa, docs }) => {
            const analista = analistas.find((a) => a.id === empresa.analistaId);
            return (
              <button
                key={empresa.id}
                type="button"
                onClick={() => onSelect(empresa.id)}
                className="w-full text-left border border-border rounded-lg p-3 bg-background hover:shadow-sm hover:border-primary/40 transition"
              >
                <div className="flex items-start gap-2">
                  <Circle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="font-medium text-sm text-foreground truncate">
                    {empresa.nome}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {docs.length} doc(s)
                  </span>
                </div>
                <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
                  {analista && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200">
                      {analista.nome}
                    </span>
                  )}
                  {docs.slice(0, 4).map((d) => {
                    const t = tipos.find((tp) => tp.id === d.tipoId);
                    return (
                      <span
                        key={d.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border"
                        style={{
                          backgroundColor: "var(--color-validated-soft)",
                          color: "oklch(0.35 0.1 95)",
                          borderColor: "var(--color-validated)",
                        }}
                      >
                        {t?.nome ?? "—"} ({d.periodo})
                      </span>
                    );
                  })}
                  {docs.length > 4 && (
                    <span className="text-xs text-muted-foreground">
                      +{docs.length - 4}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
