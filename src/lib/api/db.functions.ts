import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabase } from "../supabase.server";
import type {
  Analista,
  AnexoDoc,
  Contato,
  DocumentoStatus,
  Empresa,
  StatusDoc,
  TipoDocumento,
} from "../types";

// ─── helpers ──────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function mapTipo(r: Row): TipoDocumento {
  return {
    id: r.id as string,
    nome: r.nome as string,
    descricao: (r.descricao as string) ?? undefined,
    recorrencia: r.recorrencia as TipoDocumento["recorrencia"],
    diaLimite: (r.dia_limite as number) ?? undefined,
  };
}

function mapAnalista(r: Row): Analista {
  return { id: r.id as string, nome: r.nome as string };
}

function mapEmpresa(
  r: Row,
  contatos: Row[],
  tipoIds: string[],
): Empresa {
  return {
    id: r.id as string,
    nome: r.nome as string,
    cnpj: r.cnpj as string,
    analistaId: r.analista_id as string,
    classificacao: r.classificacao as Empresa["classificacao"],
    canal: r.canal as Empresa["canal"],
    observacoes: (r.observacoes as string) ?? undefined,
    clienteDesde: (r.cliente_desde as string) ?? undefined,
    contatos: contatos.map((c) => ({
      nome: c.nome as string,
      cargo: (c.cargo as string) ?? "",
      telefone: (c.telefone as string) ?? "",
      email: (c.email as string) ?? "",
    })) as Contato[],
    tiposDocumentoIds: tipoIds,
  };
}

function mapDocStatus(r: Row, anexo: Row | undefined): DocumentoStatus {
  return {
    id: r.id as string,
    empresaId: r.empresa_id as string,
    tipoId: r.tipo_id as string,
    periodo: r.periodo as string,
    status: r.status as StatusDoc,
    dataLimite: (r.data_limite as string) ?? undefined,
    observacao: (r.observacao as string) ?? undefined,
    justificativa: (r.justificativa as string) ?? undefined,
    recebidoEm: (r.recebido_em as string) ?? undefined,
    dispensadoEm: (r.dispensado_em as string) ?? undefined,
    validadoEm: (r.validado_em as string) ?? undefined,
    anexo: anexo
      ? {
        nome: anexo.nome as string,
        dataUrl: anexo.data_url as string,
        tamanho: anexo.tamanho as number,
        tipo: anexo.tipo as string,
        enviadoEm: anexo.enviado_em as string,
      }
      : undefined,
  };
}

// ─── fetchAll ─────────────────────────────────────────────────────────────────

export const fetchAll = createServerFn({ method: "GET" }).handler(async () => {
  const sb = getSupabase();

  const [
    { data: analistasRows, error: e1 },
    { data: tiposRows, error: e2 },
    { data: empresasRows, error: e3 },
    { data: contatosRows, error: e4 },
    { data: empTiposRows, error: e5 },
    { data: docStatusRows, error: e6 },
    { data: docAnexosRows, error: e7 },
  ] = await Promise.all([
    sb.from("analistas").select("*").order("nome"),
    sb.from("tipos_documento").select("*").order("nome"),
    sb.from("empresas").select("*").order("nome"),
    sb.from("empresa_contatos").select("*"),
    sb.from("empresa_tipos_documento").select("*"),
    sb.from("documento_status").select("*"),
    sb.from("documento_anexos").select("*"),
  ]);

  for (const [label, err] of [
    ["analistas", e1], ["tipos_documento", e2], ["empresas", e3],
    ["empresa_contatos", e4], ["empresa_tipos_documento", e5],
    ["documento_status", e6], ["documento_anexos", e7],
  ] as [string, { message: string } | null][]) {
    if (err) throw new Error(`Supabase error (${label}): ${err.message}`);
  }

  const analistas: Analista[] = (analistasRows ?? []).map((r) => mapAnalista(r as Row));

  const tipos: TipoDocumento[] = (tiposRows ?? []).map((r) => mapTipo(r as Row));

  const empresas: Empresa[] = (empresasRows ?? []).map((r) => {
    const contatos = (contatosRows ?? []).filter(
      (c) => (c as Row).empresa_id === (r as Row).id,
    ) as Row[];
    const tipoIds = (empTiposRows ?? [])
      .filter((et) => (et as Row).empresa_id === (r as Row).id)
      .map((et) => (et as Row).tipo_id as string)
      .filter((id): id is string => typeof id === "string");
    return mapEmpresa(r as Row, contatos, tipoIds);
  });

  const documentos: DocumentoStatus[] = (docStatusRows ?? []).map((r) => {
    const anexo = (docAnexosRows ?? []).find(
      (a) => (a as Row).documento_status_id === (r as Row).id,
    ) as Row | undefined;
    return mapDocStatus(r as Row, anexo);
  });

  return { analistas, tipos, empresas, documentos };
});

// ─── Analistas ────────────────────────────────────────────────────────────────

export const insertAnalista = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), nome: z.string() }))
  .handler(async ({ data }) => {
    const sb = getSupabase();
    const { error } = await sb.from("analistas").insert({ id: data.id, nome: data.nome });
    if (error) throw new Error(error.message);
  });

export const deleteAnalista = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sb = getSupabase();
    const { error } = await sb.from("analistas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// ─── Tipos de Documento ───────────────────────────────────────────────────────

export const upsertTipo = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      nome: z.string(),
      descricao: z.string().optional(),
      recorrencia: z.enum(["mensal", "trimestral", "anual", "unico"]),
      diaLimite: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sb = getSupabase();
    const { error } = await sb.from("tipos_documento").upsert({
      id: data.id,
      nome: data.nome,
      descricao: data.descricao ?? null,
      recorrencia: data.recorrencia,
      dia_limite: data.diaLimite ?? null,
    });
    if (error) throw new Error(error.message);
  });

export const deleteTipo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sb = getSupabase();
    const { error } = await sb.from("tipos_documento").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// ─── Empresas ─────────────────────────────────────────────────────────────────

const contatoSchema = z.object({
  nome: z.string(),
  cargo: z.string(),
  telefone: z.string(),
  email: z.string(),
});

export const upsertEmpresa = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      nome: z.string(),
      cnpj: z.string(),
      analistaId: z.string(),
      classificacao: z.enum(["A", "B", "C"]),
      canal: z.enum(["whatsapp", "email"]),
      observacoes: z.string().optional(),
      clienteDesde: z.string().optional(),
      contatos: z.array(contatoSchema),
      tiposDocumentoIds: z.array(z.string()),
    }),
  )
  .handler(async ({ data }) => {
    const sb = getSupabase();

    const { error: e1 } = await sb.from("empresas").upsert({
      id: data.id,
      nome: data.nome,
      cnpj: data.cnpj,
      analista_id: data.analistaId,
      classificacao: data.classificacao,
      canal: data.canal,
      observacoes: data.observacoes ?? null,
      cliente_desde: data.clienteDesde ?? null,
    });
    if (e1) throw new Error(e1.message);

    // replace contatos
    await sb.from("empresa_contatos").delete().eq("empresa_id", data.id);
    if (data.contatos.length > 0) {
      const { error: e2 } = await sb.from("empresa_contatos").insert(
        data.contatos.map((c) => ({ empresa_id: data.id, ...c })),
      );
      if (e2) throw new Error(e2.message);
    }

    // replace tipos
    await sb.from("empresa_tipos_documento").delete().eq("empresa_id", data.id);
    if (data.tiposDocumentoIds.length > 0) {
      const { error: e3 } = await sb.from("empresa_tipos_documento").insert(
        data.tiposDocumentoIds.map((tid) => ({
          empresa_id: data.id,
          tipo_id: tid,
        })),
      );
      if (e3) throw new Error(e3.message);
    }
  });

export const deleteEmpresa = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sb = getSupabase();
    // cascade expected via FK constraints; if not, delete manually
    await sb.from("empresa_contatos").delete().eq("empresa_id", data.id);
    await sb.from("empresa_tipos_documento").delete().eq("empresa_id", data.id);
    const { error } = await sb.from("empresas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// ─── Documento Status + Anexo ─────────────────────────────────────────────────

const anexoSchema = z.object({
  nome: z.string(),
  dataUrl: z.string(),
  tamanho: z.number(),
  tipo: z.string(),
  enviadoEm: z.string(),
});

export const upsertDocStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      empresaId: z.string(),
      tipoId: z.string(),
      periodo: z.string(),
      status: z.enum(["pendente", "recebido", "dispensado"]),
      dataLimite: z.string().optional(),
      observacao: z.string().optional(),
      justificativa: z.string().optional(),
      recebidoEm: z.string().optional(),
      dispensadoEm: z.string().optional(),
      anexo: anexoSchema.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sb = getSupabase();

    const { error: e1 } = await sb.from("documento_status").upsert({
      id: data.id,
      empresa_id: data.empresaId,
      tipo_id: data.tipoId,
      periodo: data.periodo,
      status: data.status,
      data_limite: data.dataLimite ?? null,
      observacao: data.observacao ?? null,
      justificativa: data.justificativa ?? null,
      recebido_em: data.recebidoEm ?? null,
      dispensado_em: data.dispensadoEm ?? null,
    });
    if (e1) throw new Error(e1.message);

    // manage anexo
    await sb.from("documento_anexos").delete().eq("documento_status_id", data.id);
    if (data.anexo) {
      const { error: e2 } = await sb.from("documento_anexos").insert({
        documento_status_id: data.id,
        nome: data.anexo.nome,
        data_url: data.anexo.dataUrl,
        tamanho: data.anexo.tamanho,
        tipo: data.anexo.tipo,
        enviado_em: data.anexo.enviadoEm,
      });
      if (e2) throw new Error(e2.message);
    }
  });
