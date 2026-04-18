import { getAppName, getAppTagline } from "@/lib/branding";
import { InterMunEmblem } from "@/components/InterMunEmblem";
import { cn } from "@/lib/utils";

export function BrandWordmark({
  className = "",
  size = "default",
}: {
  className?: string;
  /** Larger emblem only (e.g. login / signup); title and tagline stay default scale. */
  size?: "default" | "hero";
}) {
  const title = getAppName();
  const sub = getAppTagline();
  const hero = size === "hero";
  return (
    <div className={cn("text-center", className)}>
      <div className={cn("flex justify-center", hero ? "mb-5 md:mb-6" : "mb-4")}>
        <InterMunEmblem
          alt=""
          className={cn(
            hero ? "h-28 w-28 md:h-36 md:w-36 lg:h-40 lg:w-40" : "h-20 w-20 md:h-24 md:w-24"
          )}
        />
      </div>
      <p className="font-display text-3xl md:text-4xl font-semibold text-brand-navy tracking-tight">
        {title}
      </p>
      {sub ? (
        <p className="text-[0.65rem] sm:text-xs text-brand-muted mt-1.5 uppercase tracking-[0.28em]">
          {sub}
        </p>
      ) : null}
    </div>
  );
}
