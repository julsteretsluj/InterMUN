import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * If `name` starts with the same role phrase as the UI will show (e.g. profile
 * stored as "Secretary General - Jane Doe"), returns the remainder so the role
 * is not shown twice.
 */
export function stripRedundantLeadingRole(name: string, rolePhrase: string): string {
  const trimmed = name.trim();
  const pattern = rolePhrase
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const re = new RegExp(`^\\s*${pattern}\\s*(?:[-–—:]\\s*|\\s+)`, "i");
  const rest = trimmed.replace(re, "").trim();
  return rest.length > 0 ? rest : trimmed;
}

export function isRoleOnlyDisplayName(name: string, rolePhrase: string): boolean {
  return name.trim().toLowerCase() === rolePhrase.trim().toLowerCase();
}
