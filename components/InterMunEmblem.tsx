import { INTERMUN_EMBLEM_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

/**
 * InterMUN wordmark emblem for nav headers and marketing surfaces.
 * Raster assets often ship with a solid black matte; `mix-blend-screen` removes it against
 * light/dark UI so only the luminous orbit reads (replace file with transparency when available).
 */
export function InterMunEmblem({
  className,
  alt = "InterMUN",
}: {
  className?: string;
  /** Use `alt=""` when a visible “InterMUN” label sits next to the image. */
  alt?: string;
}) {
  return (
    <img
      src={INTERMUN_EMBLEM_PATH}
      alt={alt}
      className={cn("shrink-0 object-contain mix-blend-screen", className)}
      decoding="async"
    />
  );
}
