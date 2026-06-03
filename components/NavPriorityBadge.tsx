import { cn } from "@/lib/utils";

type NavPriorityBadgeProps = {
  priority: number;
  className?: string;
  /** Slightly larger badge for hub tiles. */
  variant?: "nav" | "tile";
};

export function NavPriorityBadge({ priority, className, variant = "nav" }: NavPriorityBadgeProps) {
  return (
    <span
      className={cn(
        "nav-priority-badge",
        variant === "tile" && "nav-priority-badge--tile",
        className
      )}
      aria-hidden
    >
      {priority}
    </span>
  );
}
