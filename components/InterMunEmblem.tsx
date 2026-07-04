import { INTERMUN_EMBLEM_LIGHT_PATH, INTERMUN_EMBLEM_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

/** Light wordmark is wide; drop square sizing and corner radius meant for the circular dark emblem. */
function emblemClassForLightWordmark(className?: string) {
  return className
    ?.replace(/\bw-[\w\[\]./%-]+/g, "")
    .replace(/\bh-[\w\[\]./%-]+/g, "")
    .replace(/\brounded-[\w\[\]./%-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function emblemHeightClass(className?: string) {
  const match = className?.match(/\bh-[\w\[\]./%-]+/);
  return match?.[0] ?? "h-10";
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
  const lightHeight = emblemHeightClass(className);
  return (
    <>
      <img
        src={INTERMUN_EMBLEM_LIGHT_PATH}
        alt={alt}
        className={cn(
          "w-auto max-w-full shrink-0 object-contain object-left drop-shadow-[0_4px_18px_rgba(15,23,42,0.12)] dark:hidden",
          lightHeight,
          emblemClassForLightWordmark(className)
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
