import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Session-floor monitor chrome for marketing previews. */
export function MarketingChamberFrame({
  children,
  className,
  label = "LIVE FLOOR",
  variant = "dark",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  variant?: "dark" | "light";
}) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "mun-chamber-frame overflow-hidden",
        isDark ? "mun-chamber-frame-dark" : "mun-chamber-frame-light",
        className
      )}
    >
      <div className={cn("mun-chamber-frame-bar", isDark ? "text-white/45" : "text-brand-muted")}>
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className={cn("mun-chamber-dot", isDark ? "bg-[#FF5F57]" : "bg-rose-400/80")} />
          <span className={cn("mun-chamber-dot", isDark ? "bg-[#FEBC2E]" : "bg-amber-400/80")} />
          <span className={cn("mun-chamber-dot", isDark ? "bg-[#28C840]" : "bg-emerald-500/80")} />
        </div>
        <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em]">{label}</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-[var(--accent)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" aria-hidden />
          Live
        </span>
      </div>
      <div className={cn("mun-chamber-frame-body", isDark ? "bg-[#12121A]" : "bg-[var(--material-thin)]")}>
        {children}
      </div>
    </div>
  );
}
