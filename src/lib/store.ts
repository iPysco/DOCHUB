import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AnexoDoc,
  Analista,
  DocumentoStatus,
  Empresa,
  StatusDoc,
  TipoDocumento,
} from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

interface State {
  tipos: TipoDocumento[];
  analistas: Analista[];
  empresas: Empresa[];
  documentos: DocumentoStatus[];
  analistaFiltroId: string | null;

  addTipo: (t: Omit<TipoDocumento, "id">) => void;
  updateTipo: (id: string, t: Partial<TipoDocumento>) => void;
  removeTipo: (id: string) => void;

  addAnalista: (nome: string) => void;
  removeAnalista: (id: string) => void;

  addEmpresa: (e: Omit<Empresa, "id">) => void;
  updateEmpresa: (id: string, e: Partial<Empresa>) => void;
  removeEmpresa: (id: string) => void;

  setDocStatus: (
    empresaId: string,
    tipoId: string,
    periodo: string,
    patch: Partial<DocumentoStatus>,
  ) => void;

  anexarDoc: (
    empresaId: string,
    tipoId: string,
    periodo: string,
    payload: { anexo?: AnexoDoc; dispensado?: boolean; justificativa?: string },
  ) => void;

  setAnalistaFiltro: (id: string | null) => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      tipos: [],
      analistas: [],
      empresas: [],
      documentos: [],
      analistaFiltroId: null,

      addTipo: (t) =>
        set((s) => ({ tipos: [...s.tipos, { ...t, id: uid() }] })),
      updateTipo: (id, t) =>
        set((s) => ({
          tipos: s.tipos.map((x) => (x.id === id ? { ...x, ...t } : x)),
        })),
      removeTipo: (id) =>
        set((s) => ({
          tipos: s.tipos.filter((x) => x.id !== id),
          empresas: s.empresas.map((e) => ({
            ...e,
            tiposDocumentoIds: e.tiposDocumentoIds.filter((t) => t !== id),
          })),
          documentos: s.documentos.filter((d) => d.tipoId !== id),
        })),

      addAnalista: (nome) =>
        set((s) => ({ analistas: [...s.analistas, { id: uid(), nome }] })),
      removeAnalista: (id) =>
        set((s) => ({ analistas: s.analistas.filter((a) => a.id !== id) })),

      addEmpresa: (e) =>
        set((s) => ({
          empresas: [
            ...s.empresas,
            { ...e, id: uid(), contatos: e.contatos ?? [] },
          ],
        })),
      updateEmpresa: (id, e) =>
        set((s) => ({
          empresas: s.empresas.map((x) => (x.id === id ? { ...x, ...e } : x)),
        })),
      removeEmpresa: (id) =>
        set((s) => ({
          empresas: s.empresas.filter((e) => e.id !== id),
          documentos: s.documentos.filter((d) => d.empresaId !== id),
        })),

      setDocStatus: (empresaId, tipoId, periodo, patch) =>
        set((s) => {
          const id = `${empresaId}:${tipoId}:${periodo}`;
          const existing = s.documentos.find((d) => d.id === id);
          const now = new Date().toISOString();
          const next: DocumentoStatus = existing
            ? { ...existing, ...patch }
            : {
                id,
                empresaId,
                tipoId,
                periodo,
                status: "pendente" as StatusDoc,
                ...patch,
              };
          if (patch.status === "recebido" && !next.recebidoEm)
            next.recebidoEm = now;
          return {
            documentos: existing
              ? s.documentos.map((d) => (d.id === id ? next : d))
              : [...s.documentos, next],
          };
        }),

      anexarDoc: (empresaId, tipoId, periodo, payload) =>
        set((s) => {
          const id = `${empresaId}:${tipoId}:${periodo}`;
          const existing = s.documentos.find((d) => d.id === id);
          const now = new Date().toISOString();
          let status: StatusDoc = "pendente";
          if (payload.dispensado) status = "dispensado";
          else if (payload.anexo) status = "recebido";
          const base: DocumentoStatus =
            existing ??
            ({
              id,
              empresaId,
              tipoId,
              periodo,
              status,
            } as DocumentoStatus);
          const next: DocumentoStatus = {
            ...base,
            status,
            anexo: payload.dispensado ? undefined : payload.anexo ?? base.anexo,
            justificativa: payload.dispensado
              ? payload.justificativa
              : undefined,
            recebidoEm:
              status === "recebido" ? base.recebidoEm ?? now : base.recebidoEm,
            dispensadoEm:
              status === "dispensado" ? now : base.dispensadoEm,
          };
          return {
            documentos: existing
              ? s.documentos.map((d) => (d.id === id ? next : d))
              : [...s.documentos, next],
          };
        }),

      setAnalistaFiltro: (id) => set({ analistaFiltroId: id }),
    }),
    { name: "contabil-store-v1" },
  ),
);
