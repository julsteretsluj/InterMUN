import { getAppName, getAppTagline } from "@/lib/branding";
import { InterMunEmblem } from "@/components/InterMunEmblem";
import { cn } from "@/lib/utils";

export function BrandWordmark({
  className = "",
  size = "default",
}: {
  className?: string;
  /** Larger emblem and title for auth hero (login / signup). */
  size?: "default" | "hero";
}) {
  const title = getAppName();
  const sub = getAppTagline();
  const hero = size === "hero";
  return (
    <div className={cn("text-center", className)}>
      <div className={cn("flex justify-center", hero ? "mb-6 md:mb-8" : "mb-4")}>
        <InterMunEmblem
          alt=""
          className={cn(
            hero ? "h-28 w-28 md:h-36 md:w-36 lg:h-40 lg:w-40" : "h-20 w-20 md:h-24 md:w-24"
          )}
        />
      </div>
      <p
        className={cn(
          "font-display font-semibold text-brand-navy tracking-tight",
          hero ? "text-4xl sm:text-5xl md:text-6xl" : "text-3xl md:text-4xl"
        )}
      >
        {title}
      </p>
      {sub ? (
        <p
          className={cn(
            "text-brand-muted uppercase tracking-[0.28em]",
            hero ? "mt-2 text-xs sm:text-sm md:text-base" : "mt-1.5 text-[0.65rem] sm:text-xs"
          )}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}
