import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  MessageSquareText,
  Paperclip,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EmpresaModal } from "@/components/EmpresaModal";
import { AnexoModal } from "@/components/AnexoModal";
import { useStore } from "@/lib/store";
import {
  MESES,
  MESES_LONG,
  aplicaNoMes,
  dataLimiteISO,
  periodoFor,
} from "@/lib/periodos";
import type { StatusDocView } from "@/lib/types";

export const Route = createFileRoute("/empresas/$id")({
  head: () => ({ meta: [{ title: "Empresa | DocHub" }] }),
  component: EmpresaDetail,
  notFoundComponent: () => (
    <AppLayout>
      <PageHeader title="Empresa não encontrada" />
      <div className="p-8">
        <Link to="/empresas" className="text-primary hover:underline">
          ← Voltar para empresas
        </Link>
      </div>
    </AppLayout>
  ),
});

function EmpresaDetail() {
  const { id } = Route.useParams();
  const empresa = useStore((s) => s.empresas.find((e) => e.id === id));
  const tipos = useStore((s) => s.tipos);
  const analistas = useStore((s) => s.analistas);
  const documentos = useStore((s) => s.documentos);
  const anexarDoc = useStore((s) => s.anexarDoc);
  const removeEmpresa = useStore((s) => s.removeEmpresa);
  const updateEmpresa = useStore((s) => s.updateEmpresa);

  const today = new Date();
  // Início baseado em clienteDesde (se houver), evitando partir de competências em atraso
  const inicio = (() => {
    const empresa0 = useStore.getState().empresas.find((e) => e.id === id);
    if (empresa0?.clienteDesde && /^\d{4}-\d{2}$/.test(empresa0.clienteDesde)) {
      const [yy, mm] = empresa0.clienteDesde.split("-").map(Number);
      return { ano: yy, mes: mm - 1 };
    }
    return { ano: today.getFullYear(), mes: today.getMonth() };
  })();
  const [ano, setAno] = useState(inicio.ano);
  const [mes, setMes] = useState(inicio.mes);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cobrancaOpen, setCobrancaOpen] = useState(false);
  const [bloqToast, setBloqToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMesBloqueado = (mesIdx: number) => {
    if (!empresa?.clienteDesde) return false;
    return ano < inicio.ano || (ano === inicio.ano && mesIdx < inicio.mes);
  };

  const mostrarToastBloqueio = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setBloqToast(true);
    toastTimer.current = setTimeout(() => setBloqToast(false), 5000);
  };
  const [anexoAlvo, setAnexoAlvo] = useState<{
    tipoId: string;
    tipoNome: string;
    periodo: string;
  } | null>(null);

  if (!empresa) throw notFound();

  const analista = analistas.find((a) => a.id === empresa.analistaId);
  const tiposEmpresa = tipos.filter((t) =>
    empresa.tiposDocumentoIds.includes(t.id),
  );
  const tiposNoMes = tiposEmpresa.filter((t) =>
    aplicaNoMes(t.recorrencia, mes),
  );

  const computeStatusView = (
    status: "pendente" | "recebido" | "dispensado",
    dataLimite: string,
  ): StatusDocView => {
    if (status === "pendente" && new Date(dataLimite) < new Date())
      return "atrasado";
    return status;
  };

  const docsView = tiposNoMes.map((t) => {
    const periodo = periodoFor(t.recorrencia, ano, mes);
    const doc = documentos.find(
      (d) =>
        d.empresaId === empresa.id &&
        d.tipoId === t.id &&
        d.periodo === periodo,
    );
    const dataLimite =
      doc?.dataLimite ?? dataLimiteISO(t.recorrencia, ano, mes, t.diaLimite);
    const baseStatus = (doc?.status ?? "pendente") as
      | "pendente"
      | "recebido"
      | "dispensado";
    return {
      tipo: t,
      periodo,
      status: computeStatusView(baseStatus, dataLimite),
      dataLimite,
      anexo: doc?.anexo,
      justificativa: doc?.justificativa,
    };
  });


  // === Painel de atrasados: percorre TODOS os períodos passados (respeita clienteDesde) ===
  const atrasadosGerais = useMemo(() => {
    const hoje = new Date();
    type Row = { tipoId: string; tipoNome: string; periodos: string[] };
    const map = new Map<string, Row>();
    let inicio: Date | null = null;
    if (empresa.clienteDesde && /^\d{4}-\d{2}$/.test(empresa.clienteDesde)) {
      const [yy, mm] = empresa.clienteDesde.split("-").map(Number);
      inicio = new Date(yy, mm - 1, 1);
    }
    for (const t of tiposEmpresa) {
      for (let offset = 24; offset >= 0; offset--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - offset, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        if (inicio && d < inicio) continue;
        if (!aplicaNoMes(t.recorrencia, m)) continue;
        const periodo = periodoFor(t.recorrencia, y, m);
        const dataLimite = dataLimiteISO(t.recorrencia, y, m, t.diaLimite);
        if (new Date(dataLimite) >= hoje) continue;
        const doc = documentos.find(
          (x) =>
            x.empresaId === empresa.id &&
            x.tipoId === t.id &&
            x.periodo === periodo,
        );
        const status = doc?.status ?? "pendente";
        if (status === "recebido" || status === "dispensado") continue;
        const rotulo =
          t.recorrencia === "mensal"
            ? `${String(m + 1).padStart(2, "0")}/${y}`
            : t.recorrencia === "trimestral"
              ? `Q${Math.floor(m / 3) + 1}/${y}`
              : t.recorrencia === "anual"
                ? `${y}`
                : "único";
        const existing = map.get(t.id);
        if (existing) {
          if (!existing.periodos.includes(rotulo))
            existing.periodos.push(rotulo);
        } else {
          map.set(t.id, { tipoId: t.id, tipoNome: t.nome, periodos: [rotulo] });
        }
      }
    }
    return Array.from(map.values());
  }, [tiposEmpresa, documentos, empresa.id]);

  const textoCobranca = useMemo(() => {
    const linhas = atrasadosGerais
      .map((r) => `- ${r.tipoNome}: ${r.periodos.join(", ")}`)
      .join("\n");
    return (
      `Olá! Tudo bem?\n` +
      `Estou entrando em contato, pois, estamos verificando os documentos contábeis recebidos da sua empresa, e notamos que os seguintes documentos estão pendentes:\n\n` +
      `${linhas}\n\n` +
      `Esses documentos podem ser enviados por aqui mesmo, anexados ao drive da empresa ou encaminhados para o e-mail: contabil@pirescontab.com.br\n` +
      `Como ficar melhor para você... Agradeço!!`
    );
  }, [atrasadosGerais]);

  return (
    <AppLayout>
      <PageHeader
        title={empresa.nome}
        description={`CNPJ ${empresa.cnpj} • Analista: ${analista?.nome ?? "—"} • Classe ${empresa.classificacao}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/empresas"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-input text-sm hover:bg-muted"
            >
              <ArrowLeft className="size-4" /> Voltar
            </Link>
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-input text-sm hover:bg-muted"
            >
              <Pencil className="size-4" /> Editar
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-input text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {/* Painel de documentos em atraso */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <AlertTriangle className="size-4 text-[var(--color-overdue)]" />
            <h2 className="font-semibold">Documentos em atraso</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {atrasadosGerais.length} tipo(s) com pendência
            </span>
          </div>
          {atrasadosGerais.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              Nenhum documento em atraso. 🎉
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Documento</th>
                  <th className="px-4 py-2">Datas em atraso</th>
                </tr>
              </thead>
              <tbody>
                {atrasadosGerais.map((r) => (
                  <tr key={r.tipoId} className="border-t border-border">
                    <td className="px-4 py-3 font-medium align-top">
                      {r.tipoNome}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {r.periodos.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border"
                            style={{
                              color: "var(--color-overdue)",
                              borderColor:
                                "color-mix(in oklab, var(--color-overdue) 35%, transparent)",
                              backgroundColor:
                                "color-mix(in oklab, var(--color-overdue) 15%, transparent)",
                            }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 overflow-x-auto">
            {MESES.map((m, i) => {
              const bloqueado = isMesBloqueado(i);
              return (
                <button
                  key={m}
                  onClick={() => bloqueado ? mostrarToastBloqueio() : setMes(i)}
                  disabled={false}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    bloqueado
                      ? "opacity-40 cursor-not-allowed text-muted-foreground"
                      : mes === i
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m}
                </button>
              );
            })}
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="ml-2 px-2 py-1.5 rounded-md border border-input bg-background text-sm"
            >
              {(() => {
                const fim = today.getFullYear() + 1;
                const inicioAno = Math.min(inicio.ano, fim);
                const anos: number[] = [];
                for (let y = inicioAno; y <= fim; y++) anos.push(y);
                return anos.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ));
              })()}
            </select>
          </div>

          <button
            onClick={() => setCobrancaOpen(true)}
            disabled={atrasadosGerais.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <MessageSquareText className="size-4" />
            Gerar texto de cobrança ({atrasadosGerais.length})
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold">
              {MESES_LONG[mes]} {ano}
            </h2>
            <p className="text-sm text-muted-foreground">
              {docsView.length} documento(s) esperados
            </p>
          </div>
          {docsView.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              Nenhum documento aplicável a este mês.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Recorrência</th>
                  <th className="px-4 py-3">Data limite</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Anexo</th>
                </tr>
              </thead>
              <tbody>
                {docsView.map((d) => (
                  <tr key={d.tipo.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{d.tipo.nome}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {d.tipo.recorrencia}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(d.dataLimite).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setAnexoAlvo({
                            tipoId: d.tipo.id,
                            tipoNome: d.tipo.nome,
                            periodo: d.periodo,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-input text-xs hover:bg-muted"
                      >
                        <Paperclip className="size-3" />
                        {d.anexo
                          ? d.anexo.nome.length > 22
                            ? d.anexo.nome.slice(0, 22) + "…"
                            : d.anexo.nome
                          : d.status === "dispensado"
                            ? "Dispensado"
                            : "Anexar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editOpen && (
        <EmpresaModal
          initial={empresa}
          analistas={analistas}
          tipos={tipos}
          onClose={() => setEditOpen(false)}
          onSave={(data) => {
            // CNPJ é fixo: ignora qualquer alteração
            const { cnpj: _cnpj, ...rest } = data;
            updateEmpresa(empresa.id, rest);
            setEditOpen(false);
          }}
        />
      )}

      {anexoAlvo &&
        (() => {
          const docExistente = documentos.find(
            (x) =>
              x.empresaId === empresa.id &&
              x.tipoId === anexoAlvo.tipoId &&
              x.periodo === anexoAlvo.periodo,
          );
          return (
            <AnexoModal
              documentoNome={anexoAlvo.tipoNome}
              periodoLabel={anexoAlvo.periodo}
              anexoAtual={docExistente?.anexo}
              dispensadoAtual={docExistente?.status === "dispensado"}
              justificativaAtual={docExistente?.justificativa}
              onClose={() => setAnexoAlvo(null)}
              onConfirm={(payload) => {
                anexarDoc(
                  empresa.id,
                  anexoAlvo.tipoId,
                  anexoAlvo.periodo,
                  payload,
                );
                setAnexoAlvo(null);
              }}
            />
          );
        })()}

      {bloqToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg text-white text-sm font-medium shadow-lg"
          style={{ backgroundColor: "oklch(0.32 0.14 15)" }}
        >
          Acesso bloqueado, empresa cadastrada após essa data, verificar no cadastro de empresas.
        </div>
      )}

      {cobrancaOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Texto de cobrança</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {empresa.nome} • {atrasadosGerais.length} documento(s) em atraso
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCobrancaOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <textarea
                readOnly
                value={textoCobranca}
                rows={14}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono resize-none"
              />
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCobrancaOpen(false)}
                className="px-4 py-2 rounded-md border border-input text-sm hover:bg-muted"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(textoCobranca);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <Copy className="size-4" /> Copiar texto
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <ConfirmModal
          title="Excluir empresa"
          message={`Tem certeza que deseja excluir "${empresa.nome}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={() => { removeEmpresa(empresa.id); history.back(); }}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </AppLayout>
  );
}

function StatusBadge({ status }: { status: StatusDocView }) {
  const map: Record<StatusDocView, { label: string; color: string }> = {
    recebido: { label: "Recebido", color: "var(--color-received)" },
    pendente: { label: "Pendente", color: "var(--color-pending)" },
    dispensado: { label: "Dispensado", color: "var(--color-validated)" },
    atrasado: { label: "Atrasado", color: "var(--color-overdue)" },
  };
  const { label, color } = map[status];
  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
