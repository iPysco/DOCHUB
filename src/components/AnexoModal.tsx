import { useState } from "react";
import { Paperclip, X } from "lucide-react";
import type { AnexoDoc } from "@/lib/types";

export function AnexoModal({
  documentoNome,
  periodoLabel,
  anexoAtual,
  dispensadoAtual,
  justificativaAtual,
  onClose,
  onConfirm,
}: {
  documentoNome: string;
  periodoLabel: string;
  anexoAtual?: AnexoDoc;
  dispensadoAtual?: boolean;
  justificativaAtual?: string;
  onClose: () => void;
  onConfirm: (payload: {
    anexo?: AnexoDoc;
    dispensado: boolean;
    justificativa?: string;
  }) => void;
}) {
  const [dispensado, setDispensado] = useState(!!dispensadoAtual);
  const [justificativa, setJustificativa] = useState(justificativaAtual ?? "");
  const [anexo, setAnexo] = useState<AnexoDoc | undefined>(anexoAtual);
  const [erro, setErro] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setErro("Arquivo muito grande (máx. 5 MB).");
      return;
    }
    setErro(null);
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(f);
    });
    setAnexo({
      nome: f.name,
      dataUrl,
      tamanho: f.size,
      tipo: f.type,
      enviadoEm: new Date().toISOString(),
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dispensado) {
      if (!justificativa.trim()) {
        setErro("Justificativa é obrigatória para dispensar.");
        return;
      }
    } else if (!anexo) {
      setErro("Anexo é obrigatório.");
      return;
    }
    onConfirm({
      anexo: dispensado ? undefined : anexo,
      dispensado,
      justificativa: dispensado ? justificativa.trim() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
      <form
        onSubmit={submit}
        className="bg-card rounded-xl border border-border w-full max-w-md"
      >
        <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Anexo do documento</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {documentoNome} • {periodoLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={dispensado}
              onChange={(e) => {
                setDispensado(e.target.checked);
                setErro(null);
              }}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Dispensado</span>
              <span className="block text-xs text-muted-foreground">
                Marque se o documento não precisa ser entregue neste período.
              </span>
            </span>
          </label>

          {dispensado ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Justificativa <span className="text-destructive">*</span>
              </label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
                maxLength={500}
                required
                placeholder="Motivo da dispensa..."
                className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Arquivo <span className="text-destructive">*</span>
              </label>
              <div className="mt-1">
                <label className="flex items-center justify-center gap-2 w-full py-6 rounded-md border-2 border-dashed border-input bg-background cursor-pointer hover:bg-muted/50 text-sm">
                  <Paperclip className="size-4 text-muted-foreground" />
                  <span>
                    {anexo ? (
                      <>
                        <span className="font-medium">{anexo.nome}</span>{" "}
                        <span className="text-muted-foreground">
                          ({(anexo.tamanho / 1024).toFixed(0)} KB)
                        </span>
                      </>
                    ) : (
                      "Clique para escolher um arquivo"
                    )}
                  </span>
                  <input
                    type="file"
                    onChange={onFile}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.zip"
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tamanho máximo: 5 MB.
              </p>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Observação (opcional)
                </label>
                <textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={2}
                  maxLength={300}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                />
              </div>
            </div>
          )}

          {erro && (
            <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {erro}
            </div>
          )}
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
            Confirmar
          </button>
        </div>
      </form>
    </div>
  );
}
