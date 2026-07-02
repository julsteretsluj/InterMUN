"use client";

import { AccessibilitySelector } from "@/components/AccessibilitySelector";
import { ThemeSelector } from "@/components/ThemeSelector";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { cn } from "@/lib/utils";

/** Language + accessibility + theme controls for public/pre-auth pages (entry, gates, setup). */
export function PublicPageControls({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      <div className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--material-thin)] px-1.5">
        <LanguageSwitcher />
      </div>
      <AccessibilitySelector />
      <ThemeSelector />
    </div>
  );
}
