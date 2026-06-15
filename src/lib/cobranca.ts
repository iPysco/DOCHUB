import type { DocumentoStatus, Empresa, TipoDocumento } from "./types";
import { aplicaNoMes, dataLimiteISO, periodoFor } from "./periodos";

export interface AtrasoTipo {
  tipoId: string;
  tipoNome: string;
  periodos: string[];
}

/** Calcula todos os documentos em atraso (data limite passada, não recebido/dispensado)
 * de uma empresa, varrendo os últimos `mesesParaTras` meses. */
export function calcularAtrasos(
  empresa: Empresa,
  tipos: TipoDocumento[],
  documentos: DocumentoStatus[],
  mesesParaTras = 24,
): AtrasoTipo[] {
  const hoje = new Date();
  const map = new Map<string, AtrasoTipo>();
  const tiposEmpresa = tipos.filter((t) =>
    empresa.tiposDocumentoIds.includes(t.id),
  );
  // Cliente desde define o piso para cobrança (formato YYYY-MM)
  let inicio: Date | null = null;
  if (empresa.clienteDesde && /^\d{4}-\d{2}$/.test(empresa.clienteDesde)) {
    const [yy, mm] = empresa.clienteDesde.split("-").map(Number);
    inicio = new Date(yy, mm - 1, 1);
  }
  for (const t of tiposEmpresa) {
    for (let offset = mesesParaTras; offset >= 0; offset--) {
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
        if (!existing.periodos.includes(rotulo)) existing.periodos.push(rotulo);
      } else {
        map.set(t.id, { tipoId: t.id, tipoNome: t.nome, periodos: [rotulo] });
      }
    }
  }
  return Array.from(map.values());
}

/** Calcula documentos pendentes: a competência só entra como pendente
 * quando chegamos no mês seguinte ao da competência e ainda não passou a data limite.
 * Respeita `clienteDesde` da empresa. */
export function calcularPendentes(
  empresa: Empresa,
  tipos: TipoDocumento[],
  documentos: DocumentoStatus[],
  mesesParaTras = 24,
): AtrasoTipo[] {
  const hoje = new Date();
  const map = new Map<string, AtrasoTipo>();
  const tiposEmpresa = tipos.filter((t) =>
    empresa.tiposDocumentoIds.includes(t.id),
  );
  let inicio: Date | null = null;
  if (empresa.clienteDesde && /^\d{4}-\d{2}$/.test(empresa.clienteDesde)) {
    const [yy, mm] = empresa.clienteDesde.split("-").map(Number);
    inicio = new Date(yy, mm - 1, 1);
  }
  for (const t of tiposEmpresa) {
    for (let offset = mesesParaTras; offset >= 0; offset--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - offset, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      if (inicio && d < inicio) continue;
      if (!aplicaNoMes(t.recorrencia, m)) continue;
      // A cobrança da competência só inicia no 1º dia do mês seguinte
      const inicioCobranca = new Date(y, m + 1, 1);
      if (hoje < inicioCobranca) continue;
      const dataLimite = new Date(
        dataLimiteISO(t.recorrencia, y, m, t.diaLimite),
      );
      if (hoje > dataLimite) continue; // já virou atraso
      const periodo = periodoFor(t.recorrencia, y, m);
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
        if (!existing.periodos.includes(rotulo)) existing.periodos.push(rotulo);
      } else {
        map.set(t.id, { tipoId: t.id, tipoNome: t.nome, periodos: [rotulo] });
      }
    }
  }
  return Array.from(map.values());
}

export function montarTextoCobranca(atrasos: AtrasoTipo[]): string {
  const linhas = atrasos
    .map((r) => `- ${r.tipoNome}: ${r.periodos.join(", ")}`)
    .join("\n");
  return (
    `Olá! Tudo bem?\n` +
    `Estou entrando em contato, pois, estamos verificando os documentos contábeis recebidos da sua empresa, e notamos que os seguintes documentos estão pendentes:\n\n` +
    `${linhas}\n\n` +
    `Esses documentos podem ser enviados por aqui mesmo, anexados ao drive da empresa ou encaminhados para o e-mail: contabil@pirescontab.com.br\n` +
    `Como ficar melhor para você... Agradeço!!`
  );
}
