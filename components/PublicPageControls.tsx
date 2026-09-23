// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { ChromePreferencesMenu } from "@/components/ChromePreferencesMenu";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { cn } from "@/lib/utils";

/** Compact language + appearance/accessibility controls for public/pre-auth pages. */
export function PublicPageControls({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-end gap-1.5", className)}>
      <div
        className={cn(
          "inline-flex items-center border border-[var(--hairline)] bg-[var(--material-thin)]",
          compact ? "h-8 rounded-[var(--radius-md)] px-1" : "h-9 rounded-[var(--radius-md)] px-1.5"
        )}
      >
        <LanguageSwitcher compact={compact} className="flex min-w-0" />
      </div>
      <ChromePreferencesMenu compact={compact} includeLanguage={false} />
    </div>
  );
}
