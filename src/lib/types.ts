export type Recorrencia = "mensal" | "trimestral" | "anual" | "unico";
export type Classificacao = "A" | "B" | "C";
export type Canal = "whatsapp" | "email";
// status persistido. "atrasado" é derivado de pendente + dataLimite < hoje.
export type StatusDoc = "pendente" | "recebido" | "dispensado";
export type StatusDocView = StatusDoc | "atrasado";

export interface TipoDocumento {
  id: string;
  nome: string;
  descricao?: string;
  recorrencia: Recorrencia;
  /** Dia limite (1-31) do mês seguinte para entrega. Default 10. */
  diaLimite?: number;
}

export interface Analista {
  id: string;
  nome: string;
}

export interface Contato {
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  analistaId: string;
  classificacao: Classificacao;
  canal: Canal;
  observacoes?: string;
  /** Mês a partir do qual a empresa é cliente (formato YYYY-MM). Define o início da cobrança de documentos. */
  clienteDesde?: string;
  contatos: Contato[];
  // legado (mantido para compat)
  telefone?: string;
  email?: string;
  tiposDocumentoIds: string[];
}

export interface AnexoDoc {
  nome: string;
  /** dataURL base64 */
  dataUrl: string;
  tamanho: number;
  tipo: string;
  enviadoEm: string;
}

export interface DocumentoStatus {
  id: string; // empresaId:tipoId:periodo
  empresaId: string;
  tipoId: string;
  periodo: string;
  status: StatusDoc;
  dataLimite?: string;
  observacao?: string;
  justificativa?: string;
  anexo?: AnexoDoc;
  recebidoEm?: string;
  dispensadoEm?: string;
  validadoEm?: string;
}
