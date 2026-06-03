import Link from "next/link";
import { NavPriorityBadge } from "@/components/NavPriorityBadge";
import { cn } from "@/lib/utils";

type PriorityTabLinkProps = {
  href: string;
  label: string;
  priority: number;
  active: boolean;
  activeClassName: string;
  inactiveClassName: string;
};

export function PriorityTabLink({
  href,
  label,
  priority,
  active,
  activeClassName,
  inactiveClassName,
}: PriorityTabLinkProps) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      aria-label={`${priority}. ${label}`}
      className={cn(
        "nav-priority-tab relative rounded-t-xl px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
        active ? activeClassName : inactiveClassName
      )}
    >
      <NavPriorityBadge priority={priority} className="left-1.5 top-1.5" />
      {label}
    </Link>
  );
}
