import Link from "next/link";
import { NavPriorityBadge } from "@/components/NavPriorityBadge";
import { cn } from "@/lib/utils";

type HubTileLinkProps = {
  href: string;
  label: string;
  hint: string;
  priority: number;
  /** Overview quick tiles use cream fill; Jump tab uses white card. */
  variant?: "overview" | "jump";
};

export function HubTileLink({
  href,
  label,
  hint,
  priority,
  variant = "jump",
}: HubTileLinkProps) {
  return (
    <Link
      href={href}
      aria-label={`${priority}. ${label}`}
      className={cn(
        "hub-tile-link relative flex h-full flex-col rounded-xl border border-[var(--hairline)] px-4 py-4 pl-10 transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--hairline))] hover:shadow-[var(--dashboard-shadow-hover)]",
        variant === "overview"
          ? "bg-[var(--dashboard-cream)]"
          : "bg-white shadow-[var(--dashboard-shadow)] dark:border-zinc-700 dark:bg-zinc-900/80"
      )}
    >
      <NavPriorityBadge priority={priority} variant="tile" />
      <span className="font-semibold text-brand-navy dark:text-zinc-50">{label}</span>
      <span className="mt-1 text-xs text-brand-muted dark:text-zinc-400">{hint}</span>
    </Link>
  );
}
