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
  const alt = sub ? `${title} — ${sub}` : title;
  return (
    <div className={cn("text-center", className)}>
      <div className="flex justify-center">
        <InterMunEmblem
          alt={alt}
          className={cn(
            hero ? "h-28 w-28 md:h-36 md:w-36 lg:h-40 lg:w-40" : "h-20 w-20 md:h-24 md:w-24"
          )}
        />
      </div>
    </div>
  );
}
