"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandWordmark } from "@/components/BrandWordmark";
import { OrbAnimationOverlay } from "@/components/marketing/OrbAnimationOverlay";
import { cn } from "@/lib/utils";

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function GateBrandWordmark({
  className = "",
  size = "default",
}: {
  className?: string;
  size?: "default" | "hero";
}) {
  const t = useTranslations("marketing");
  const isDark = useIsDarkMode();
  const [playing, setPlaying] = useState(false);
  const [playKey, setPlayKey] = useState(0);

  const handlePlay = useCallback(() => {
    if (isDark) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (playing) return;

    setPlayKey((key) => key + 1);
    setPlaying(true);
  }, [isDark, playing]);

  const wordmark = <BrandWordmark className={className} size={size} />;

  if (isDark) {
    return wordmark;
  }

  return (
    <>
      <button
        type="button"
        onClick={handlePlay}
        className={cn(
          "mx-auto block w-full cursor-pointer rounded-2xl border-0 bg-transparent p-0 text-center transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
        )}
        aria-label={t("playOrbAnimation")}
      >
        {wordmark}
      </button>
      <OrbAnimationOverlay
        open={playing}
        playKey={playKey}
        onComplete={() => setPlaying(false)}
      />
    </>
  );
}
