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

/** Committee emblem — transparent PNG as uploaded; no background box or blend modes. */
export function CommitteeLogo({ src, alt, size = "sm", className }: CommitteeLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-transparent",
        SIZE_CLASS[size],
        className
      )}
    >
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" decoding="async" />
    </span>
  );
}
