import { INTERMUN_EMBLEM_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

/** InterMUN emblem (`public/intermun-emblem.png`). */
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
      className={cn(
        // Raster asset includes a solid black matte; screen-blend lets it read as transparent over any backdrop.
        "shrink-0 object-contain mix-blend-screen drop-shadow-[0_4px_18px_rgba(15,23,42,0.12)] dark:drop-shadow-[0_4px_22px_rgba(0,0,0,0.45)]",
        className
      )}
      decoding="async"
    />
  );
}
