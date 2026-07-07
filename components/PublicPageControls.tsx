// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { AccessibilitySelector } from "@/components/AccessibilitySelector";
import { ThemeSelector } from "@/components/ThemeSelector";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { cn } from "@/lib/utils";

/** Language + accessibility + theme controls for public/pre-auth pages (entry, gates, setup). */
export function PublicPageControls({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      <div
        className={cn(
          "inline-flex items-center rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--material-thin)]",
          compact ? "h-8 px-1" : "h-9 px-1.5"
        )}
      >
        <LanguageSwitcher compact={compact} />
      </div>
      <AccessibilitySelector compact={compact} />
      <ThemeSelector compact={compact} />
    </div>
  );
}
