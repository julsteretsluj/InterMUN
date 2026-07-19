// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { BrandWordmark } from "@/components/BrandWordmark";
import { OrbPlayTrigger } from "@/components/marketing/OrbPlayTrigger";

export function GateBrandWordmark({
  className = "",
  size = "default",
}: {
  className?: string;
  size?: "default" | "hero";
}) {
  return (
    // Full-width block so the emblem centers in the card (the trigger button
    // otherwise shrinks to content width and hugs the left edge).
    <OrbPlayTrigger className="mx-auto block w-full text-center">
      <BrandWordmark className={className} size={size} />
    </OrbPlayTrigger>
  );
}
