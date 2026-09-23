// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, Settings } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AccessibilitySettingsPanel } from "@/components/AccessibilitySettingsPanel";
import { ThemeSettingsPanel } from "@/components/ThemeSettingsPanel";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { SignOutButton } from "@/components/SignOutButton";
import {
  ApplePopover,
  ApplePopoverContent,
  ApplePopoverTrigger,
} from "@/components/ui/ApplePopover";
import { cn } from "@/lib/utils";

function initialsFromName(name: string, email: string): string {
  const n = name.trim();
  if (n.length > 0) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0] ?? "?";
  return local.slice(0, 2).toUpperCase();
}

function formatHeaderDate(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

function formatHeaderTime(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

type AccountProps = {
  userName: string;
  userEmail: string;
  profilePictureUrl?: string | null;
  profileHref: string;
  conferenceLine?: string | null;
  showDelegateHubLink?: boolean;
};

/**
 * Preferences / account disclosure for chrome surfaces.
 * Language lives in a separate control; this menu covers appearance, colour, and accessibility.
 */
export function ChromePreferencesMenu({
  className,
  compact = false,
  account,
  includeLanguage = false,
  extraLinks,
  footer,
}: {
  className?: string;
  compact?: boolean;
  account?: AccountProps;
  /** Prefer a standalone LanguageSwitcher in the toolbar; keep false by default. */
  includeLanguage?: boolean;
  extraLinks?: { href: string; label: string }[];
  footer?: ReactNode;
}) {
  const t = useTranslations("chromePreferences");
  const tBar = useTranslations("dashboardTopBar");
  const tLang = useTranslations("language");
  const locale = useLocale();
  const now = new Date();

  const triggerClass = cn(
    "inline-flex shrink-0 items-center justify-center text-brand-navy transition-apple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
    account ? "gap-1.5 rounded-[var(--radius-pill)] py-0.5 pl-0.5 pr-1" : "",
    className
  );

  const chipClass = cn(
    "inline-flex items-center justify-center border border-[var(--hairline)] bg-[var(--material-thin)] transition-apple hover:bg-[color:var(--discord-hover-bg)]",
    account
      ? "gap-1.5 rounded-[var(--radius-pill)] py-1 pl-1 pr-1.5"
      : cn("rounded-[var(--radius-md)]", compact ? "size-8" : "size-9")
  );

  return (
    <ApplePopover>
      <ApplePopoverTrigger
        aria-label={account ? t("accountAria") : t("openAria")}
        className={triggerClass}
      >
        <span className={chipClass}>
          {account ? (
            <>
              {account.profilePictureUrl?.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={account.profilePictureUrl.trim()}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-[var(--radius-md)] object-cover"
                />
              ) : (
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)] text-xs font-bold text-white"
                  aria-hidden
                >
                  {initialsFromName(account.userName, account.userEmail)}
                </span>
              )}
              <ChevronDown className="hidden h-4 w-4 shrink-0 text-brand-muted sm:block" strokeWidth={1.75} aria-hidden />
            </>
          ) : (
            <Settings className="size-4" strokeWidth={2} aria-hidden />
          )}
        </span>
      </ApplePopoverTrigger>
      <ApplePopoverContent
        side="bottom"
        align="end"
        fitViewport
        panelWidth={320}
        aria-label={account ? t("accountAria") : t("openAria")}
        className="mun-popover !p-0"
      >
        <div className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto overscroll-contain p-3">
          {account ? (
            <div className="space-y-2 border-b border-[var(--hairline)] pb-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-navy">{account.userName}</p>
                <p className="truncate text-[0.7rem] text-brand-muted">{account.userEmail}</p>
              </div>
              {account.conferenceLine ? (
                <p className="truncate text-xs font-medium text-brand-diplomatic">{account.conferenceLine}</p>
              ) : null}
              <p className="text-[0.7rem] text-brand-muted" suppressHydrationWarning>
                {formatHeaderDate(now, locale)} · {formatHeaderTime(now, locale)}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Link
                  href={account.profileHref}
                  className="rounded-[var(--radius-pill)] border border-[var(--hairline)] bg-[var(--material-thin)] px-2.5 py-1 text-xs font-semibold text-brand-navy transition-apple hover:bg-[color:var(--discord-hover-bg)]"
                >
                  {t("profile")}
                </Link>
                <Link
                  href="/"
                  className="rounded-[var(--radius-pill)] border border-[var(--hairline)] bg-[var(--material-thin)] px-2.5 py-1 text-xs font-semibold text-brand-navy transition-apple hover:bg-[color:var(--discord-hover-bg)]"
                >
                  {tBar("backToHome")}
                </Link>
                {account.showDelegateHubLink ? (
                  <Link
                    href="/delegate"
                    className="rounded-[var(--radius-pill)] border border-[var(--hairline)] bg-[var(--material-thin)] px-2.5 py-1 text-xs font-semibold text-brand-navy transition-apple hover:bg-[color:var(--discord-hover-bg)]"
                  >
                    {tBar("delegateHub")}
                  </Link>
                ) : null}
                {extraLinks?.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-[var(--radius-pill)] border border-[var(--hairline)] bg-[var(--material-thin)] px-2.5 py-1 text-xs font-semibold text-brand-navy transition-apple hover:bg-[color:var(--discord-hover-bg)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {includeLanguage ? (
            <div className="space-y-2">
              <p className="tag tag-neutral mb-0">{tLang("label")}</p>
              <div className="rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--material-thin)] px-2">
                <LanguageSwitcher className="flex w-full min-w-0" />
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="tag tag-neutral mb-0">{t("appearanceAndAccess")}</p>
            <ThemeSettingsPanel />
            <AccessibilitySettingsPanel />
          </div>

          {footer}

          {account ? (
            <div className="border-t border-[var(--hairline)] pt-2">
              <SignOutButton className="w-full px-2 py-1.5 text-left text-sm" />
            </div>
          ) : null}
        </div>
      </ApplePopoverContent>
    </ApplePopover>
  );
}
