/**
 * Versão global do sistema Precify.
 * Usada para controlar compatibilidade de conteúdo de ajuda.
 * Incrementar sempre que houver alteração funcional significativa.
 */
export const SYSTEM_VERSION = "1.0.0";

/**
 * Compara uma expressão semver (ex: ">=1.0.0") com a versão atual do sistema.
 * Suporta: >=, >, <=, <, = e versão pura (tratada como =).
 */
export function isVersionCompatible(requirement: string, currentVersion: string = SYSTEM_VERSION): boolean {
  const match = requirement.match(/^(>=|<=|>|<|=)?(\d+\.\d+\.\d+)$/);
  if (!match) return false;

  const operator = match[1] || "=";
  const required = match[2];

  const toNum = (v: string) => {
    const [major, minor, patch] = v.split(".").map(Number);
    return major * 10000 + minor * 100 + patch;
  };

  const cur = toNum(currentVersion);
  const req = toNum(required);

  switch (operator) {
    case ">=": return cur >= req;
    case "<=": return cur <= req;
    case ">": return cur > req;
    case "<": return cur < req;
    case "=": return cur === req;
    default: return false;
  }
}
