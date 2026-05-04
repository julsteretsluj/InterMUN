export type AppRole = "delegate" | "chair" | "smt" | "admin" | "unknown";

export function normalizeAppRole(role: string | null | undefined): AppRole {
  const r = role?.toString().trim().toLowerCase();
  if (r === "delegate" || r === "chair" || r === "smt" || r === "admin") return r;
  return "unknown";
}

export const RoleVisibility = {
  canRenameSessionHistory(role: string | null | undefined): boolean {
    const r = normalizeAppRole(role);
    return r === "chair" || r === "smt" || r === "admin";
  },
  canDeleteSessionHistory(role: string | null | undefined): boolean {
    const r = normalizeAppRole(role);
    return r === "smt" || r === "admin";
  },
  canBroadcastNotes(role: string | null | undefined): boolean {
    const r = normalizeAppRole(role);
    return r === "chair" || r === "smt" || r === "admin";
  },
  canModerateNotes(role: string | null | undefined): boolean {
    const r = normalizeAppRole(role);
    return r === "chair" || r === "smt" || r === "admin";
  },
} as const;
