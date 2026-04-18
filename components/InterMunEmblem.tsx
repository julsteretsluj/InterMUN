import { INTERMUN_EMBLEM_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

/**
 * InterMUN orbit emblem. The shipped PNG may include a black matte; `mix-blend-lighten`
 * drops that matte against light and dark UI (per-channel max with backdrop) without the
 * “white-out” effect of `screen`. Replace `public/intermun-emblem.png` with a transparent
 * asset whenever you have one—then remove the blend class.
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
      className={cn("shrink-0 object-contain mix-blend-lighten", className)}
      decoding="async"
    />
  );
}
