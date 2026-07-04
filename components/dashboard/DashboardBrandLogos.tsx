import { InterMunEmblem } from "@/components/InterMunEmblem";
import { cn } from "@/lib/utils";

/** Conference event mark shown beside the platform emblem when an event uses branded assets. */
const SEAMUN_LOGO_SRC = "/seamun-i-2027-logo.png";

/**
 * Sidebar / header brand row: InterMUN alone, or conference mark + InterMUN when the active event is branded.
 */
export function DashboardBrandLogos({
  showConferenceLogo,
  variant,
}: {
  showConferenceLogo: boolean;
  variant: "sidebar" | "topbar";
}) {
  const eventIconClass = "h-8 w-8 shrink-0 object-contain";
  const intermunClass =
    variant === "sidebar"
      ? showConferenceLogo
        ? "h-8 w-8"
        : "h-10 w-10"
      : showConferenceLogo
        ? "h-8 w-8"
        : "h-9 w-9";

  if (!showConferenceLogo) {
    return <InterMunEmblem alt="" className={intermunClass} />;
  }

  return (
    <span
      className={cn(
        "group/logo-stack flex shrink-0 items-center justify-center overflow-visible transition-all duration-200",
        variant === "sidebar"
          ? "flex-col gap-1 group-hover:flex-row group-hover:gap-1.5"
          : "flex-row gap-2"
      )}
    >
      <img src={SEAMUN_LOGO_SRC} alt="" className={eventIconClass} decoding="async" />
      <span
        className={cn(
          "shrink-0 select-none font-semibold leading-none text-brand-muted dark:text-zinc-500",
          variant === "sidebar" ? "text-[0.7rem] sm:text-xs" : "text-[0.65rem]"
        )}
        aria-hidden
      >
        ×
      </span>
      <InterMunEmblem alt="" className={intermunClass} />
    </span>
  );
}
