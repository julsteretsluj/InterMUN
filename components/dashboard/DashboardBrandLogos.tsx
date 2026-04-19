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
  const singleClass =
    variant === "sidebar" ? "h-10 w-10 rounded-2xl" : "h-9 w-9 rounded-xl";
  const dualClass = "h-8 w-8 rounded-xl";

  if (!showConferenceLogo) {
    return <InterMunEmblem alt="" className={singleClass} />;
  }

  return (
    <span
      className={cn("flex shrink-0 items-center", variant === "sidebar" ? "gap-1.5" : "gap-2")}
    >
      <img src={SEAMUN_LOGO_SRC} alt="" className={cn("object-contain", dualClass)} decoding="async" />
      <InterMunEmblem alt="" className={dualClass} />
    </span>
  );
}
