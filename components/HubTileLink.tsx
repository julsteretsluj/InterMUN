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
        "hub-tile-link mun-lift group relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--hairline)] px-4 py-4 pl-12",
        variant === "overview"
          ? "bg-[var(--dashboard-cream)]"
          : "bg-[var(--dashboard-card)] shadow-[var(--dashboard-shadow)]"
      )}
    >
      {/* Gold edge reveal on hover (Gavelling accent) */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-gradient-to-b from-[var(--gold)] to-[var(--gold-bright)] transition-transform duration-[var(--dur-base)] ease-[var(--ease-apple)] group-hover:scale-y-100"
      />
      <NavPriorityBadge priority={priority} variant="tile" />
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold text-brand-navy">{label}</span>
        <span
          aria-hidden
          className="translate-x-0 text-brand-muted opacity-0 transition-all duration-[var(--dur-base)] ease-[var(--ease-apple)] group-hover:translate-x-0.5 group-hover:text-[var(--accent)] group-hover:opacity-100"
        >
          →
        </span>
      </span>
      <span className="mt-1 text-xs leading-relaxed text-brand-muted">{hint}</span>
    </Link>
  );
}
