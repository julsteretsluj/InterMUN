import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
} as const;

type CommitteeLogoProps = {
  src: string;
  alt: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

/** Bust CDN/browser cache after storage re-uploads or batch knockout. */
const LOGO_DISPLAY_CACHE_VERSION = "knockout2";

function committeeLogoSrc(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/[?&]v=/.test(t)) return t;
  const tsMatch = t.match(/\/(\d{10,})\.png(?:\?|$)/i);
  const v = tsMatch?.[1] ?? LOGO_DISPLAY_CACHE_VERSION;
  const sep = t.includes("?") ? "&" : "?";
  return `${t}${sep}v=${v}`;
}

/** Committee emblem without a card background box — expects a transparent PNG. */
export function CommitteeLogo({ src, alt, size = "sm", className }: CommitteeLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-transparent",
        SIZE_CLASS[size],
        className
      )}
    >
      <img
        src={committeeLogoSrc(src)}
        alt={alt}
        className="max-h-full max-w-full object-contain dark:mix-blend-screen"
        decoding="async"
      />
    </span>
  );
}
