import { create } from "zustand";
import type {
  AnexoDoc,
  Analista,
  DocumentoStatus,
  Empresa,
  StatusDoc,
  TipoDocumento,
} from "./types";
import {
  fetchAll,
  insertAnalista,
  deleteAnalista,
  upsertTipo,
  deleteTipo,
  upsertEmpresa,
  deleteEmpresa,
  upsertDocStatus,
} from "./api/db.functions";

const uid = () => crypto.randomUUID();

interface State {
  tipos: TipoDocumento[];
  analistas: Analista[];
  empresas: Empresa[];
  documentos: DocumentoStatus[];
  analistaFiltroId: string | null;
  loaded: boolean;

  init: () => Promise<void>;

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

export const useStore = create<State>()((set, get) => ({
  tipos: [],
  analistas: [],
  empresas: [],
  documentos: [],
  analistaFiltroId: null,
  loaded: false,

  init: async () => {
    if (get().loaded) return;
    const data = await fetchAll();
    set({ ...data, loaded: true });
  },

  // ── Tipos ──────────────────────────────────────────────────────────────────

  addTipo: (t) => {
    const id = uid();
    const novo = { ...t, id };
    set((s) => ({ tipos: [...s.tipos, novo] }));
    upsertTipo({ id, nome: t.nome, descricao: t.descricao, recorrencia: t.recorrencia, diaLimite: t.diaLimite }).catch(console.error);
  },

  updateTipo: (id, t) => {
    set((s) => ({
      tipos: s.tipos.map((x) => (x.id === id ? { ...x, ...t } : x)),
    }));
    const updated = get().tipos.find((x) => x.id === id);
    if (updated) upsertTipo({ id, nome: updated.nome, descricao: updated.descricao, recorrencia: updated.recorrencia, diaLimite: updated.diaLimite }).catch(console.error);
  },

  removeTipo: (id) => {
    set((s) => ({
      tipos: s.tipos.filter((x) => x.id !== id),
      empresas: s.empresas.map((e) => ({
        ...e,
        tiposDocumentoIds: e.tiposDocumentoIds.filter((t) => t !== id),
      })),
      documentos: s.documentos.filter((d) => d.tipoId !== id),
    }));
    deleteTipo({ id }).catch(console.error);
  },

  // ── Analistas ──────────────────────────────────────────────────────────────

  addAnalista: (nome) => {
    const id = uid();
    set((s) => ({ analistas: [...s.analistas, { id, nome }] }));
    insertAnalista({ id, nome }).catch(console.error);
  },

  removeAnalista: (id) => {
    set((s) => ({ analistas: s.analistas.filter((a) => a.id !== id) }));
    deleteAnalista({ id }).catch(console.error);
  },

  // ── Empresas ───────────────────────────────────────────────────────────────

  addEmpresa: (e) => {
    const id = uid();
    const nova: Empresa = { ...e, id, contatos: e.contatos ?? [] };
    set((s) => ({ empresas: [...s.empresas, nova] }));
    upsertEmpresa({ id, nome: nova.nome, cnpj: nova.cnpj, analistaId: nova.analistaId, classificacao: nova.classificacao, canal: nova.canal, observacoes: nova.observacoes, clienteDesde: nova.clienteDesde, contatos: nova.contatos, tiposDocumentoIds: nova.tiposDocumentoIds }).catch(console.error);
  },

  updateEmpresa: (id, e) => {
    set((s) => ({
      empresas: s.empresas.map((x) => (x.id === id ? { ...x, ...e } : x)),
    }));
    const updated = get().empresas.find((x) => x.id === id);
    if (updated) upsertEmpresa({ id, nome: updated.nome, cnpj: updated.cnpj, analistaId: updated.analistaId, classificacao: updated.classificacao, canal: updated.canal, observacoes: updated.observacoes, clienteDesde: updated.clienteDesde, contatos: updated.contatos, tiposDocumentoIds: updated.tiposDocumentoIds }).catch(console.error);
  },

  removeEmpresa: (id) => {
    set((s) => ({
      empresas: s.empresas.filter((e) => e.id !== id),
      documentos: s.documentos.filter((d) => d.empresaId !== id),
    }));
    deleteEmpresa({ id }).catch(console.error);
  },

  // ── Documentos ─────────────────────────────────────────────────────────────

  setDocStatus: (empresaId, tipoId, periodo, patch) => {
    set((s) => {
      const id = `${empresaId}:${tipoId}:${periodo}`;
      const existing = s.documentos.find((d) => d.id === id);
      const now = new Date().toISOString();
      const next: DocumentoStatus = existing
        ? { ...existing, ...patch }
        : { id, empresaId, tipoId, periodo, status: "pendente" as StatusDoc, ...patch };
      if (patch.status === "recebido" && !next.recebidoEm) next.recebidoEm = now;
      const documentos = existing
        ? s.documentos.map((d) => (d.id === id ? next : d))
        : [...s.documentos, next];
      upsertDocStatus({ id: next.id, empresaId: next.empresaId, tipoId: next.tipoId, periodo: next.periodo, status: next.status, dataLimite: next.dataLimite, observacao: next.observacao, justificativa: next.justificativa, recebidoEm: next.recebidoEm, dispensadoEm: next.dispensadoEm, anexo: next.anexo }).catch(console.error);
      return { documentos };
    });
  },

  anexarDoc: (empresaId, tipoId, periodo, payload) => {
    set((s) => {
      const id = `${empresaId}:${tipoId}:${periodo}`;
      const existing = s.documentos.find((d) => d.id === id);
      const now = new Date().toISOString();
      let status: StatusDoc = "pendente";
      if (payload.dispensado) status = "dispensado";
      else if (payload.anexo) status = "recebido";
      const base: DocumentoStatus = existing ?? ({ id, empresaId, tipoId, periodo, status } as DocumentoStatus);
      const next: DocumentoStatus = {
        ...base,
        status,
        anexo: payload.dispensado ? undefined : payload.anexo ?? base.anexo,
        justificativa: payload.dispensado ? payload.justificativa : undefined,
        recebidoEm: status === "recebido" ? base.recebidoEm ?? now : base.recebidoEm,
        dispensadoEm: status === "dispensado" ? now : base.dispensadoEm,
      };
      const documentos = existing
        ? s.documentos.map((d) => (d.id === id ? next : d))
        : [...s.documentos, next];
      upsertDocStatus({ id: next.id, empresaId: next.empresaId, tipoId: next.tipoId, periodo: next.periodo, status: next.status, dataLimite: next.dataLimite, observacao: next.observacao, justificativa: next.justificativa, recebidoEm: next.recebidoEm, dispensadoEm: next.dispensadoEm, anexo: next.anexo }).catch(console.error);
      return { documentos };
    });
  },

  setAnalistaFiltro: (id) => set({ analistaFiltroId: id }),
}));
