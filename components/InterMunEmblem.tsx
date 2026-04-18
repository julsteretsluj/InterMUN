import { INTERMUN_EMBLEM_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

/**
 * InterMUN orbit emblem. The PNG may include a dark matte; we frame it on a compact
 * slate gradient “dock” (not flat black) so the art reads clearly on light pages without
 * blend modes that blow out on white backdrops. Swap in a transparent PNG anytime.
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
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-600 via-slate-800 to-slate-950 p-2 shadow-[0_10px_36px_-8px_rgba(51,102,255,0.35)] ring-1 ring-white/25 dark:from-slate-800 dark:via-slate-900 dark:to-black dark:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.55)] dark:ring-white/12",
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
