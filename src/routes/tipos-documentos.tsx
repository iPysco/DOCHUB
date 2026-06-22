import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Plus, Pencil, X } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import type { Recorrencia } from "@/lib/types";

export const Route = createFileRoute("/tipos-documentos")({
  head: () => ({
    meta: [{ title: "Tipos de Documentos | DocHub" }],
  }),
  component: TiposPage,
});

const recOptions: { value: Recorrencia; label: string }[] = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "anual", label: "Anual" },
  { value: "unico", label: "Único" },
];

function TiposPage() {
  const tipos = useStore((s) => s.tipos);
  const addTipo = useStore((s) => s.addTipo);
  const updateTipo = useStore((s) => s.updateTipo);
  const removeTipo = useStore((s) => s.removeTipo);

  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [recorrencia, setRecorrencia] = useState<Recorrencia>("mensal");
  const [diaLimite, setDiaLimite] = useState<number>(10);

  const reset = () => {
    setEditId(null);
    setNome("");
    setDescricao("");
    setRecorrencia("mensal");
    setDiaLimite(10);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    const payload = {
      nome: nome.trim(),
      descricao: descricao.trim(),
      recorrencia,
      diaLimite,
    };
    if (editId) updateTipo(editId, payload);
    else addTipo(payload);
    reset();
  };

  const startEdit = (id: string) => {
    const t = tipos.find((x) => x.id === id);
    if (!t) return;
    setEditId(t.id);
    setNome(t.nome);
    setDescricao(t.descricao ?? "");
    setRecorrencia(t.recorrencia);
    setDiaLimite(t.diaLimite ?? 10);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Tipos de Documentos"
        description="Catálogo global de documentos que os clientes podem enviar"
      />
      <div className="p-8 grid lg:grid-cols-3 gap-6">
        <form
          onSubmit={onSubmit}
          className="bg-card border border-border rounded-xl p-6 space-y-4 lg:col-span-1 h-fit"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {editId ? "Editar tipo" : "Novo tipo"}
            </h2>
            {editId && (
              <button
                type="button"
                onClick={reset}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <X className="size-3" /> Cancelar
              </button>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Nome
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={120}
              placeholder="Ex: Extrato bancário"
              className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={300}
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Recorrência
            </label>
            <select
              value={recorrencia}
              onChange={(e) => setRecorrencia(e.target.value as Recorrencia)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              {recOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Data limite (dia do mês seguinte)
            </label>
            <select
              value={diaLimite}
              onChange={(e) => setDiaLimite(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Dia {d}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            {editId ? (
              <>
                <Pencil className="size-4" /> Salvar alterações
              </>
            ) : (
              <>
                <Plus className="size-4" /> Adicionar
              </>
            )}
          </button>
        </form>

        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Recorrência</th>
                <th className="px-4 py-3">Dia limite</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3 w-20 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tipos.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Nenhum tipo cadastrado ainda.
                  </td>
                </tr>
              ) : (
                tipos.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{t.nome}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-primary-soft text-xs capitalize">
                        {t.recorrencia}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      Dia {t.diaLimite ?? 10}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.descricao || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(t.id)}
                          className="text-muted-foreground hover:text-primary"
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remover "${t.nome}"?`)) {
                              if (editId === t.id) reset();
                              removeTipo(t.id);
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
