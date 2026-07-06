// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { InterMunEmblem } from "@/components/InterMunEmblem";
import { OrbPlayTrigger } from "@/components/marketing/OrbPlayTrigger";
import { cn } from "@/lib/utils";

export function MarketingOrbTrigger({
  className,
  emblemClassName,
}: {
  className?: string;
  emblemClassName?: string;
}) {
  return (
    <OrbPlayTrigger className={className}>
      <InterMunEmblem alt="" className={cn("max-h-10 w-auto md:max-h-11", emblemClassName)} />
    </OrbPlayTrigger>
  );
}
