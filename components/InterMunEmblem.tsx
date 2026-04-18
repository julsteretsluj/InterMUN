import { INTERMUN_EMBLEM_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

/**
 * InterMUN wordmark emblem for nav headers and marketing surfaces.
 * Pair with visible app title and pass `alt=""` when the title is redundant for screen readers.
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
      className={cn("shrink-0 object-contain", className)}
      decoding="async"
    />
  );
}
