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

/** Bust CDN/browser cache after storage re-uploads. */
function committeeLogoDisplaySrc(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/[?&]v=/.test(t)) return t;
  const tsMatch = t.match(/\/(\d{10,})\.png(?:\?|$)/i);
  const v = tsMatch?.[1] ?? "edge-knockout-1";
  const sep = t.includes("?") ? "&" : "?";
  return `${t}${sep}v=${v}`;
}

/** Committee emblem — transparent PNG; no background box. */
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
        src={committeeLogoDisplaySrc(src)}
        alt={alt}
        className="max-h-full max-w-full object-contain"
        decoding="async"
      />
    </span>
  );
}
