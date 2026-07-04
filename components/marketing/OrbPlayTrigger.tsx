"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { OrbAnimationOverlay } from "@/components/marketing/OrbAnimationOverlay";
import { cn } from "@/lib/utils";

export function OrbPlayTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("marketing");
  const [playing, setPlaying] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const handleComplete = useCallback(() => setPlaying(false), []);

  const handlePlay = useCallback(() => {
    setPlayKey((key) => key + 1);
    setPlaying(true);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handlePlay}
        className={cn(
          "cursor-pointer rounded-2xl border-0 bg-transparent p-0 text-left transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]",
          className
        )}
        aria-label={t("playOrbAnimation")}
      >
        {children}
      </button>
      <OrbAnimationOverlay
        open={playing}
        playKey={playKey}
        onComplete={handleComplete}
      />
    </>
  );
}
