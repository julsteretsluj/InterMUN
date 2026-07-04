import { INTERMUN_EMBLEM_LIGHT_PATH, INTERMUN_EMBLEM_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

/** Strip fixed width utilities so the horizontal light wordmark can scale naturally. */
function emblemClassWithoutFixedWidth(className?: string) {
  return className?.replace(/\bw-[\w\[\]./%-]+/g, "").replace(/\s+/g, " ").trim();
}

/**
 * InterMUN emblem. Light mode uses the rainbow chain wordmark
 * (`public/intermun-emblem-light.png`); dark mode uses the full circular
 * mark with laurel wreath (`public/intermun-emblem.png`).
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
    <>
      <img
        src={INTERMUN_EMBLEM_LIGHT_PATH}
        alt={alt}
        className={cn(
          "w-auto shrink-0 object-contain drop-shadow-[0_4px_18px_rgba(15,23,42,0.12)] dark:hidden",
          emblemClassWithoutFixedWidth(className)
        )}
        decoding="async"
      />
      <img
        src={INTERMUN_EMBLEM_PATH}
        alt={alt}
        className={cn(
          "hidden shrink-0 object-contain drop-shadow-[0_4px_22px_rgba(0,0,0,0.45)] dark:block",
          className
        )}
        decoding="async"
      />
    </>
  );
}
