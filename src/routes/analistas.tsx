import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/analistas")({
  head: () => ({ meta: [{ title: "Analistas | DocHub" }] }),
  component: AnalistasPage,
});

function AnalistasPage() {
  const analistas = useStore((s) => s.analistas);
  const empresas = useStore((s) => s.empresas);
  const addAnalista = useStore((s) => s.addAnalista);
  const removeAnalista = useStore((s) => s.removeAnalista);
  const [nome, setNome] = useState("");
  const [deleteAnalista, setDeleteAnalista] = useState<{ id: string; nome: string } | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    addAnalista(nome.trim());
    setNome("");
  };

  return (
    <AppLayout>
      <PageHeader title="Analistas" description="Equipe responsável pelas carteiras" />
      <div className="p-8 grid lg:grid-cols-3 gap-6">
        <form
          onSubmit={onSubmit}
          className="bg-card border border-border rounded-xl p-6 space-y-4 h-fit"
        >
          <h2 className="font-semibold">Novo analista</h2>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={120}
            placeholder="Nome completo"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            required
          />
          <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="size-4" /> Adicionar
          </button>
        </form>

        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Empresas na carteira</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {analistas.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum analista cadastrado.
                  </td>
                </tr>
              ) : (
                analistas.map((a) => {
                  const qt = empresas.filter((e) => e.analistaId === a.id).length;
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{a.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{qt}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (qt > 0) {
                              alert("Reatribua as empresas antes de remover.");
                              return;
                            }
                            setDeleteAnalista(a);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
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

      {deleteAnalista && (
        <ConfirmModal
          title="Remover analista"
          message={`Tem certeza que deseja remover "${deleteAnalista.nome}"?`}
          confirmLabel="Remover"
          onConfirm={() => removeAnalista(deleteAnalista.id)}
          onClose={() => setDeleteAnalista(null)}
        />
      )}
    </AppLayout>
  );
}
