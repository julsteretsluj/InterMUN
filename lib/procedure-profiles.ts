export type ProcedureProfile = "default" | "eu_parliament";

export function normalizeProcedureProfile(value: string | null | undefined): ProcedureProfile {
  return value?.toString().trim().toLowerCase() === "eu_parliament" ? "eu_parliament" : "default";
}

export function isEuParliamentProcedure(value: string | null | undefined): boolean {
  return normalizeProcedureProfile(value) === "eu_parliament";
}
