/**
 * Utilitário centralizado de datas — Fuso horário: America/Sao_Paulo
 *
 * Princípios:
 * - Armazenamento: UTC (padrão do banco)
 * - Exibição: sempre America/Sao_Paulo
 * - Logs/tracking: UTC (correto para auditoria)
 */

import { format as dateFnsFormat } from "date-fns";
import { ptBR } from "date-fns/locale";

export const SP_TIMEZONE = "America/Sao_Paulo";

/**
 * Converte uma data para o horário de São Paulo antes de formatar com date-fns.
 * Isso garante que mesmo em servidores/navegadores com outro fuso, a data exibida
 * será sempre no horário de SP.
 */
function toSPDate(input: string | Date): Date {
  const date = typeof input === "string" ? new Date(input) : input;
  // Pega o offset de SP para essa data específica (lida com horário de verão)
  const spString = date.toLocaleString("en-US", { timeZone: SP_TIMEZONE });
  return new Date(spString);
}

/**
 * Formata uma data usando date-fns com locale pt-BR, convertendo para fuso de SP.
 *
 * @param input - Data como string ISO ou objeto Date
 * @param formatStr - Formato date-fns (ex: "dd/MM/yyyy HH:mm")
 * @returns String formatada no horário de São Paulo
 *
 * @example
 * formatDateSP("2026-03-11T15:30:00Z", "dd/MM/yyyy HH:mm")
 * // => "11/03/2026 12:30" (SP = UTC-3)
 */
export function formatDateSP(input: string | Date, formatStr: string): string {
  return dateFnsFormat(toSPDate(input), formatStr, { locale: ptBR });
}

/**
 * Formata data/hora completa para exibição ao usuário.
 * Formato: "11/03/2026 12:30"
 */
export function formatDateTimeBR(input: string | Date): string {
  return formatDateSP(input, "dd/MM/yyyy HH:mm");
}

/**
 * Formata apenas a data para exibição.
 * Formato: "11/03/2026"
 */
export function formatDateBR(input: string | Date): string {
  return formatDateSP(input, "dd/MM/yyyy");
}

/**
 * Retorna data/hora atual formatada no fuso de SP.
 * Útil para mensagens de toast, logs visuais etc.
 */
export function nowBR(): string {
  return new Date().toLocaleString("pt-BR", { timeZone: SP_TIMEZONE });
}

/**
 * Formata data para exibição curta (dd/MM).
 */
export function formatShortDateSP(input: string | Date): string {
  return formatDateSP(input, "dd/MM");
}

/**
 * Formata data para exibição em formato extenso.
 * Ex: "11 de março"
 */
export function formatLongDateSP(input: string | Date): string {
  return formatDateSP(input, "dd 'de' MMMM");
}

/**
 * Converte data para toLocaleDateString no fuso de SP.
 * Substitui `new Date(x).toLocaleDateString("pt-BR")`.
 */
export function toLocaleDateBR(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleDateString("pt-BR", { timeZone: SP_TIMEZONE });
}

/**
 * Converte data para toLocaleString no fuso de SP.
 * Substitui `new Date(x).toLocaleString("pt-BR")`.
 */
export function toLocaleStringBR(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleString("pt-BR", { timeZone: SP_TIMEZONE });
}
