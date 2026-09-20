// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { ChromePreferencesMenu } from "@/components/ChromePreferencesMenu";
import { cn } from "@/lib/utils";

/** Compact preferences disclosure for public/pre-auth pages (entry, gates, setup, marketing). */
export function PublicPageControls({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-end", className)}>
      <ChromePreferencesMenu compact={compact} />
    </div>
  );
}
