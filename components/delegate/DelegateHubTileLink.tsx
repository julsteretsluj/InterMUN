import Link from "next/link";
import { cn } from "@/lib/utils";

type DelegateHubTileLinkProps = {
  href: string;
  label: string;
  hint: string;
  priority: number;
  /** Overview quick tiles use cream fill; Jump tab uses white card. */
  variant?: "overview" | "jump";
};

export function DelegateHubTileLink({
  href,
  label,
  hint,
  priority,
  variant = "jump",
}: DelegateHubTileLinkProps) {
  return (
    <Link
      href={href}
      aria-label={`${priority}. ${label}`}
      className={cn(
        "delegate-hub-tile relative flex h-full flex-col rounded-xl border border-[var(--hairline)] px-3.5 py-3 pl-9 transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--hairline))] hover:shadow-[var(--dashboard-shadow-hover)]",
        variant === "overview"
          ? "bg-[var(--dashboard-cream)]"
          : "bg-white shadow-[var(--dashboard-shadow)] dark:border-zinc-700 dark:bg-zinc-900/80"
      )}
    >
      <span className="delegate-hub-tile-priority" aria-hidden>
        {priority}
      </span>
      <span className="font-semibold text-brand-navy dark:text-zinc-50">{label}</span>
      <span className="mt-0.5 text-xs text-brand-muted dark:text-zinc-400">{hint}</span>
    </Link>
  );
}
