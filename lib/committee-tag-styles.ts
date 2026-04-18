/**
 * Distinct pill colours per committee metadata category so tags are easy to scan.
 * Used on SMT overview cards and committee detail rows.
 */

const pill =
  "inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold";

export function difficultyTagClass(level: "Beginner" | "Intermediate" | "Advanced"): string {
  switch (level) {
    case "Beginner":
      return `${pill} border-emerald-400/65 bg-emerald-100 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/55 dark:text-emerald-50`;
    case "Intermediate":
      return `${pill} border-amber-400/65 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/55 dark:text-amber-50`;
    case "Advanced":
      return `${pill} border-rose-400/65 bg-rose-100 text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/55 dark:text-rose-50`;
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function formatTagClass(format: "Traditional" | "Crisis"): string {
  switch (format) {
    case "Traditional":
      return `${pill} border-brand-accent/50 bg-brand-accent/14 text-brand-navy dark:border-brand-accent/45 dark:bg-brand-accent/18 dark:text-brand-accent-bright`;
    case "Crisis":
      return `${pill} border-orange-400/65 bg-orange-100 text-orange-950 dark:border-orange-500/40 dark:bg-orange-950/55 dark:text-orange-50`;
    default: {
      const _exhaustive: never = format;
      return _exhaustive;
    }
  }
}

export function ageRangeTagClass(): string {
  return `${pill} border-logo-cyan/50 bg-logo-cyan/14 text-brand-navy dark:border-logo-cyan/45 dark:bg-logo-cyan/16 dark:text-brand-accent-bright`;
}

/** Pill for the age-range line (same colour whenever text differs). */
export function eslFriendlyTagClass(eslFriendly: boolean): string {
  if (eslFriendly) {
    return `${pill} border-violet-400/65 bg-violet-100 text-violet-950 dark:border-violet-500/40 dark:bg-violet-950/55 dark:text-violet-50`;
  }
  return `${pill} border-zinc-300/75 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-300`;
}
