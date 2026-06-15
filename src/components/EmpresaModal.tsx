import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Canal, Classificacao, Contato, Empresa } from "@/lib/types";

export interface EmpresaFormData {
  nome: string;
  cnpj: string;
  analistaId: string;
  classificacao: Classificacao;
  canal: Canal;
  observacoes?: string;
  clienteDesde?: string;
  contatos: Contato[];
  tiposDocumentoIds: string[];
}

const emptyContato = (): Contato => ({
  nome: "",
  cargo: "",
  telefone: "",
  email: "",
});

export function EmpresaModal({
  onClose,
  onSave,
  analistas,
  tipos,
  initial,
  title,
}: {
  onClose: () => void;
  onSave: (data: EmpresaFormData) => void;
  analistas: { id: string; nome: string }[];
  tipos: { id: string; nome: string }[];
  initial?: Empresa;
  title?: string;
}) {
  const isEdit = !!initial;
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [cnpj, setCnpj] = useState(initial?.cnpj ?? "");
  const [analistaId, setAnalistaId] = useState(
    initial?.analistaId ?? analistas[0]?.id ?? "",
  );
  const [classificacao, setClassificacao] = useState<Classificacao>(
    initial?.classificacao ?? "B",
  );
  const [canal, setCanal] = useState<Canal>(initial?.canal ?? "whatsapp");
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [clienteDesde, setClienteDesde] = useState(
    initial?.clienteDesde ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
  );
  const [contatos, setContatos] = useState<Contato[]>(() => {
    const base = initial?.contatos?.length ? initial.contatos : [];
    // garantir pelo menos 3 linhas vazias para preenchimento
    const arr = [...base];
    while (arr.length < 3) arr.push(emptyContato());
    return arr;
  });
  const [selected, setSelected] = useState<string[]>(
    initial?.tiposDocumentoIds ?? [],
  );

  const updateContato = (idx: number, patch: Partial<Contato>) =>
    setContatos((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cnpj.trim() || !analistaId) return;
    const contatosLimpos = contatos
      .map((c) => ({
        nome: c.nome.trim(),
        cargo: c.cargo.trim(),
        telefone: c.telefone.trim(),
        email: c.email.trim(),
      }))
      .filter((c) => c.nome || c.telefone || c.email);
    onSave({
      nome: nome.trim(),
      cnpj: cnpj.trim(),
      analistaId,
      classificacao,
      canal,
      observacoes: observacoes.trim() || undefined,
      clienteDesde: clienteDesde || undefined,
      contatos: contatosLimpos,
      tiposDocumentoIds: selected,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
      <form
        onSubmit={submit}
        className="bg-card rounded-xl border border-border w-full max-w-3xl max-h-[92vh] overflow-y-auto"
      >
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-lg">
            {title ?? (isEdit ? "Editar empresa" : "Nova empresa")}
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={150}
                required
                className="input"
              />
            </Field>
            <Field label={`CNPJ${isEdit ? " (fixo)" : ""}`}>
              <input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                maxLength={20}
                required
                disabled={isEdit}
                className="input disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </Field>
            <Field label="Analista responsável">
              <select
                value={analistaId}
                onChange={(e) => setAnalistaId(e.target.value)}
                className="input"
                required
              >
                {analistas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Classificação">
              <div className="flex gap-2">
                {(["A", "B", "C"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setClassificacao(c)}
                    className={`flex-1 py-2 rounded-md border text-sm font-medium ${
                      classificacao === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Canal de cobrança">
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value as Canal)}
                className="input"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
              </select>
            </Field>
            <Field label="Cliente desde">
              <input
                type="month"
                value={clienteDesde}
                onChange={(e) => setClienteDesde(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Observações">
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                maxLength={1000}
                rows={2}
                className="input resize-none"
              />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground">
                Contatos da empresa ({contatos.length})
              </div>
              <button
                type="button"
                onClick={() => setContatos((cs) => [...cs, emptyContato()])}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="size-3" /> Adicionar contato
              </button>
            </div>
            <div className="space-y-2">
              {contatos.map((c, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1.2fr_1fr_1fr_1.4fr_auto] gap-2 items-center"
                >
                  <input
                    value={c.nome}
                    onChange={(e) =>
                      updateContato(idx, { nome: e.target.value })
                    }
                    placeholder="Nome"
                    maxLength={100}
                    className="input"
                  />
                  <input
                    value={c.cargo}
                    onChange={(e) =>
                      updateContato(idx, { cargo: e.target.value })
                    }
                    placeholder="Cargo"
                    maxLength={80}
                    className="input"
                  />
                  <input
                    value={c.telefone}
                    onChange={(e) =>
                      updateContato(idx, { telefone: e.target.value })
                    }
                    placeholder="Telefone"
                    maxLength={20}
                    className="input"
                  />
                  <input
                    type="email"
                    value={c.email}
                    onChange={(e) =>
                      updateContato(idx, { email: e.target.value })
                    }
                    placeholder="E-mail"
                    maxLength={150}
                    className="input"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setContatos((cs) =>
                        cs.length > 1 ? cs.filter((_, i) => i !== idx) : cs,
                      )
                    }
                    className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label="Remover contato"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recomendamos cadastrar ao menos 3 contatos (responsável, financeiro
              e fiscal, por exemplo).
            </p>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Documentos exigidos
            </div>
            {tipos.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 rounded-md bg-muted">
                Cadastre tipos de documentos primeiro.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-md border border-border">
                {tipos.map((t) => {
                  const checked = selected.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked
                              ? [...prev, t.id]
                              : prev.filter((x) => x !== t.id),
                          )
                        }
                      />
                      {t.nome}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-input text-sm hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            {isEdit ? "Salvar alterações" : "Salvar empresa"}
          </button>
        </div>
      </form>
      <style>{`.input { width:100%; padding:0.5rem 0.75rem; border:1px solid var(--color-input); border-radius:0.375rem; background:var(--color-background); font-size: 0.875rem; }`}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}
