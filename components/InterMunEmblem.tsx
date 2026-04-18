import { INTERMUN_EMBLEM_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

/**
 * InterMUN orbit emblem. The raster includes a solid black matte; we sit it on a near-black
 * “plate” so the matte disappears and rainbow strokes stay saturated (works on light and dark UI).
 * Prefer a transparent PNG in public/ when you have one—then you can flatten the plate styling.
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
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 to-black p-[0.35rem] shadow-[0_4px_18px_rgba(0,0,0,0.25)] ring-1 ring-black/45 dark:from-black dark:to-zinc-950 dark:ring-white/18 dark:shadow-[0_4px_26px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      <img
        src={INTERMUN_EMBLEM_PATH}
        alt={alt}
        className="max-h-full max-w-full object-contain"
        decoding="async"
      />
    </span>
  );
}
