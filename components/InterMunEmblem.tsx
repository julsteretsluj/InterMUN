import { INTERMUN_EMBLEM_LIGHT_PATH, INTERMUN_EMBLEM_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

/** Prefer explicit max-height utilities; otherwise map square icon heights for the wordmark. */
function lightWordmarkMaxHeight(className?: string): string {
  const maxHTokens = className?.match(/\b(?:sm:|md:|lg:|xl:)?max-h-[\w\[\]./%-]+/g);
  if (maxHTokens?.length) return maxHTokens.join(" ");

  const hClass = className?.match(/\bh-[\w\[\]./%-]+/)?.[0];
  if (!hClass) return "max-h-10";
  switch (hClass) {
    case "h-8":
      return "max-h-10";
    case "h-9":
      return "max-h-11";
    case "h-10":
      return "max-h-12";
    case "h-20":
      return "max-h-24";
    case "h-24":
      return "max-h-28";
    case "h-28":
      return "max-h-32";
    case "h-36":
      return "max-h-40";
    case "h-40":
      return "max-h-44";
    default:
      return hClass.replace(/^h-/, "max-h-");
  }
}

function lightWordmarkMaxWidth(className?: string): string | undefined {
  const widthTokens = className?.match(/\b(?:sm:|md:|lg:|xl:)?(?:max-w-|w-auto|w-full)[\w\[\]./%-]*/g);
  if (widthTokens?.length) return widthTokens.join(" ");

  const wClass = className?.match(/\bw-[\w\[\]./%-]+/)?.[0];
  if (!wClass) return undefined;
  switch (wClass) {
    case "w-8":
      return "max-w-[4.75rem]";
    case "w-9":
      return "max-w-[5.25rem]";
    case "w-10":
      return "max-w-[5.75rem]";
    case "w-20":
      return "max-w-[14rem]";
    case "w-24":
      return "max-w-[16rem]";
    case "w-28":
      return "max-w-[18rem]";
    case "w-36":
      return "max-w-[22rem]";
    case "w-40":
      return "max-w-[24rem]";
    default:
      return wClass.replace(/^w-/, "max-w-");
  }
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
  const lightMaxH = lightWordmarkMaxHeight(className);
  const lightMaxW = lightWordmarkMaxWidth(className);

  return (
    <>
      <span className="inline-flex shrink-0 items-center justify-center overflow-visible leading-none dark:hidden">
        <img
          src={INTERMUN_EMBLEM_LIGHT_PATH}
          alt={alt}
          className={cn(
            "block h-auto w-auto shrink-0 object-contain object-center",
            lightMaxH,
            lightMaxW,
            "drop-shadow-[0_4px_18px_rgba(15,23,42,0.12)]"
          )}
          decoding="async"
        />
      </span>
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
