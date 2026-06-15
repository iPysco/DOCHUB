import type { Recorrencia } from "./types";

export const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
export const MESES_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Periodo string para um mês/ano dado uma recorrência. */
export function periodoFor(rec: Recorrencia, ano: number, mes0: number): string {
  if (rec === "mensal") return `${ano}-${String(mes0 + 1).padStart(2, "0")}`;
  if (rec === "trimestral") return `${ano}-Q${Math.floor(mes0 / 3) + 1}`;
  if (rec === "anual") return `${ano}`;
  return "unico";
}

/** Mes em que o documento "vence" para uma recorrência (último mês do período). */
export function aplicaNoMes(rec: Recorrencia, mes0: number): boolean {
  if (rec === "mensal") return true;
  if (rec === "trimestral") return mes0 % 3 === 2; // mar, jun, set, dez
  if (rec === "anual") return mes0 === 2; // entrega em março do ano seguinte? simplificação: mar
  return mes0 === 0; // único: aparece em janeiro
}

export function dataLimiteISO(
  rec: Recorrencia,
  ano: number,
  mes0: number,
  diaLimite: number = 10,
) {
  const dia = Math.min(Math.max(diaLimite, 1), 28);
  const d = new Date(ano, mes0 + 1, dia);
  return d.toISOString();
}
