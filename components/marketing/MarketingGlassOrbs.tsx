// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { MarketingGlassOrb } from "@/components/marketing/MarketingGlassOrb";

type MarketingGlassOrbsProps = {
  variant: "hero" | "steps" | "origin" | "contact" | "footer";
};

/** Ambient glass orbs — Spline when exported, CSS glass fallback otherwise. */
export function MarketingGlassOrbs({ variant }: MarketingGlassOrbsProps) {
  switch (variant) {
    case "hero":
      return (
        <>
          <MarketingGlassOrb placement="mun-marketing-glass-orb--hero-tr" size="xl" delay={1} />
          <MarketingGlassOrb placement="mun-marketing-glass-orb--hero-bl" size="lg" delay={2} />
        </>
      );
    case "steps":
      return <MarketingGlassOrb placement="mun-marketing-glass-orb--steps-r" size="md" delay={2} />;
    case "origin":
      return <MarketingGlassOrb placement="mun-marketing-glass-orb--origin-l" size="sm" delay={1} />;
    case "contact":
      return <MarketingGlassOrb placement="mun-marketing-glass-orb--contact-r" size="md" delay={3} />;
    case "footer":
      return (
        <>
          <MarketingGlassOrb placement="mun-marketing-glass-orb--footer-l" size="lg" delay={1} />
          <MarketingGlassOrb placement="mun-marketing-glass-orb--footer-r" size="sm" delay={2} />
        </>
      );
    default:
      return null;
  }
}
