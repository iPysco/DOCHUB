import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Pencil, Plus, Search, Upload } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { EmpresaModal } from "@/components/EmpresaModal";
import { useStore } from "@/lib/store";
import type { Canal, Classificacao } from "@/lib/types";

export const Route = createFileRoute("/empresas/")({
  head: () => ({ meta: [{ title: "Empresas | DocHub" }] }),
  component: EmpresasList,
});

function EmpresasList() {
  const empresas = useStore((s) => s.empresas);
  const analistas = useStore((s) => s.analistas);
  const tipos = useStore((s) => s.tipos);
  const addEmpresa = useStore((s) => s.addEmpresa);
  const updateEmpresa = useStore((s) => s.updateEmpresa);
  const filtroId = useStore((s) => s.analistaFiltroId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editEmpresa, setEditEmpresa] = useState<typeof empresas[0] | null>(null);
  const [q, setQ] = useState("");

  const handleCsv = async (file: File) => {
    const text = await file.text();
    const linhas = text.split(/\r?\n/).filter((l) => l.trim());
    if (linhas.length < 2) {
      setImportMsg("CSV vazio ou sem dados.");
      return;
    }
    const splitCsv = (l: string) => {
      const out: string[] = [];
      let cur = "";
      let q = false;
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if (c === '"') {
          if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q;
        } else if (c === "," && !q) {
          out.push(cur); cur = "";
        } else cur += c;
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };
    const header = splitCsv(linhas[0]).map((h) => h.toLowerCase());
    const idx = (k: string) => header.indexOf(k);
    const iNome = idx("nome");
    const iCnpj = idx("cnpj");
    const iAnalista = idx("analista");
    const iClass = idx("classificacao");
    const iCanal = idx("canal");
    const iDesde = idx("clientedesde");
    const iObs = idx("observacoes");
    const iTipos = idx("tipos");
    const iContatos = idx("contatos");
    if (iNome < 0 || iCnpj < 0 || iAnalista < 0) {
      setImportMsg(
        "Cabeçalho inválido. Use: nome,cnpj,analista,classificacao,canal,clienteDesde,observacoes,tipos,contatos",
      );
      return;
    }
    let ok = 0;
    let skip = 0;
    for (let i = 1; i < linhas.length; i++) {
      const c = splitCsv(linhas[i]);
      const nome = c[iNome];
      const cnpj = c[iCnpj];
      const analistaRaw = c[iAnalista];
      if (!nome || !cnpj || !analistaRaw) { skip++; continue; }
      const analista = analistas.find(
        (a) => a.nome.toLowerCase() === analistaRaw.toLowerCase() || a.id === analistaRaw,
      );
      if (!analista) { skip++; continue; }
      const cls = (iClass >= 0 ? c[iClass] : "B").toUpperCase() as Classificacao;
      const canal = ((iCanal >= 0 ? c[iCanal] : "whatsapp").toLowerCase() === "email"
        ? "email"
        : "whatsapp") as Canal;
      // tipos: nomes separados por ";"
      const tiposIds: string[] = [];
      if (iTipos >= 0 && c[iTipos]) {
        for (const nomeTipo of c[iTipos].split(";").map((s) => s.trim()).filter(Boolean)) {
          const t = tipos.find(
            (tp) => tp.nome.toLowerCase() === nomeTipo.toLowerCase() || tp.id === nomeTipo,
          );
          if (t) tiposIds.push(t.id);
        }
      }
      // contatos: "nome|cargo|telefone|email" separados por ";"
      const contatos: { nome: string; cargo: string; telefone: string; email: string }[] = [];
      if (iContatos >= 0 && c[iContatos]) {
        for (const ct of c[iContatos].split(";").map((s) => s.trim()).filter(Boolean)) {
          const [n = "", cg = "", tel = "", em = ""] = ct.split("|").map((s) => s.trim());
          if (n || tel || em) contatos.push({ nome: n, cargo: cg, telefone: tel, email: em });
        }
      }
      addEmpresa({
        nome,
        cnpj,
        analistaId: analista.id,
        classificacao: (["A", "B", "C"].includes(cls) ? cls : "B") as Classificacao,
        canal,
        observacoes: iObs >= 0 ? c[iObs] || undefined : undefined,
        clienteDesde: iDesde >= 0 ? c[iDesde] || undefined : undefined,
        contatos,
        tiposDocumentoIds: tiposIds,
      });
      ok++;
    }
    setImportMsg(`${ok} empresa(s) importada(s). ${skip} ignorada(s).`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const lista = useMemo(() => {
    let l = empresas;
    if (filtroId) l = l.filter((e) => e.analistaId === filtroId);
    if (q.trim()) {
      const s = q.toLowerCase();
      l = l.filter(
        (e) => e.nome.toLowerCase().includes(s) || e.cnpj.includes(s),
      );
    }
    return l;
  }, [empresas, filtroId, q]);

  return (
    <AppLayout>
      <PageHeader
        title="Empresas"
        description={`${lista.length} cliente(s)${filtroId ? " na carteira" : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCsv(f);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-card text-sm font-medium hover:bg-muted"
              title="Importar empresas via CSV (nome,cnpj,analista,classificacao,canal,clienteDesde,observacoes)"
            >
              <Upload className="size-4" /> Importar CSV
            </button>
            <button
              onClick={() => {
                if (analistas.length === 0) {
                  alert("Cadastre um analista primeiro.");
                  return;
                }
                setOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              <Plus className="size-4" /> Nova empresa
            </button>
          </div>
        }
      />

      {importMsg && (
        <div className="px-8 pt-4">
          <div className="text-sm px-4 py-2 rounded-md bg-primary-soft text-primary border border-primary/20 flex items-center justify-between gap-2">
            <span>{importMsg}</span>
            <button onClick={() => setImportMsg(null)} className="text-xs hover:underline">fechar</button>
          </div>
        </div>
      )}

      <div className="p-8 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-card text-sm"
          />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">CNPJ</th>
                <th className="px-4 py-3">Analista</th>
                <th className="px-4 py-3">Class.</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    {empresas.length === 0
                      ? "Cadastre sua primeira empresa."
                      : "Nenhuma empresa encontrada."}
                  </td>
                </tr>
              ) : (
                lista.map((e) => {
                  const an = analistas.find((a) => a.id === e.analistaId);
                  return (
                    <tr
                      key={e.id}
                      className="border-t border-border hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to="/empresas/$id"
                          params={{ id: e.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {e.nome}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {e.cnpj}
                      </td>
                      <td className="px-4 py-3">{an?.nome ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex size-6 rounded-full bg-primary-soft text-primary items-center justify-center font-semibold text-xs">
                          {e.classificacao}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">
                        {e.canal}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {e.tiposDocumentoIds.length}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditEmpresa(e)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Editar empresa"
                        >
                          <Pencil className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <EmpresaModal
          onClose={() => setOpen(false)}
          onSave={(data) => {
            addEmpresa(data);
            setOpen(false);
          }}
          analistas={analistas}
          tipos={tipos}
        />
      )}

      {editEmpresa && (
        <EmpresaModal
          initial={editEmpresa}
          onClose={() => setEditEmpresa(null)}
          onSave={(data) => {
            const { cnpj: _cnpj, ...rest } = data;
            updateEmpresa(editEmpresa.id, rest);
            setEditEmpresa(null);
          }}
          analistas={analistas}
          tipos={tipos}
        />
      )}
    </AppLayout>
  );
}
