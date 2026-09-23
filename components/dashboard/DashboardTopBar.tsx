// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import Link from "next/link";
import { ChromePreferencesMenu } from "@/components/ChromePreferencesMenu";
import { DashboardBrandLogos } from "@/components/dashboard/DashboardBrandLogos";
import { DashboardSearch } from "@/components/dashboard/DashboardSearch";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useTranslations } from "next-intl";
import { switchSmtToSecretariatAction } from "@/app/actions/smtDashboardSurface";

export function DashboardTopBar({
  userName,
  userEmail,
  profilePictureUrl,
  conferenceLine,
  showSeamunLogo,
  appName,
  notifications,
  showDelegateHubLink,
  showExitSmtPreview,
  brandHomeHref,
  profileHref = "/profile",
}: {
  userName: string;
  userEmail: string;
  profilePictureUrl?: string | null;
  conferenceLine: string | null;
  showSeamunLogo: boolean;
  appName: string;
  notifications?: ReactNode;
  /** Chairs see a quick jump to the SEAMUNs-style delegate hub. */
  showDelegateHubLink?: boolean;
  /** SMT in chair/delegate preview: quick return to SMT secretariat hub. */
  showExitSmtPreview?: boolean;
  /** Mobile header logo target (sidebar brand uses the same hub). */
  brandHomeHref?: string;
  /** Account menu target (e.g. SMT uses `/smt/profile`). */
  profileHref?: string;
}) {
  const tSmtView = useTranslations("smtCommitteeView");
  const [pendingExitSurface, startExitSurface] = useTransition();

  function exitSmtPreview() {
    startExitSurface(async () => {
      await switchSmtToSecretariatAction();
    });
  }

  return (
    <header
      data-tour="tour-topbar"
      className="mun-toolbar-titlebar sticky top-0 z-20 flex shrink-0 flex-col border-b border-[var(--hairline)] bg-[var(--dashboard-card)] shadow-[0_4px_18px_-16px_rgba(15,23,42,0.45)] transition-[background-color,box-shadow] duration-300 dark:bg-[var(--material-chrome)]"
    >
      <div className="flex w-full items-center gap-2 px-4 py-2 sm:gap-2.5 sm:px-6 sm:py-1.5">
        <Link
          href={brandHomeHref ?? "/profile"}
          className="flex shrink-0 items-center gap-2 lg:hidden"
          aria-label={`${appName} home`}
        >
          <DashboardBrandLogos showConferenceLogo={showSeamunLogo} variant="topbar" />
        </Link>
        <div className="min-w-0 flex-1">
          <DashboardSearch />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {showExitSmtPreview ? (
            <button
              type="button"
              disabled={pendingExitSurface}
              onClick={exitSmtPreview}
              className="rounded-[var(--radius-pill)] border border-[var(--hairline)] bg-[var(--material-thin)] px-2.5 py-1.5 text-xs font-semibold text-brand-navy transition-apple hover:border-[color:color-mix(in_srgb,var(--accent)_40%,var(--hairline))] hover:bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] disabled:opacity-60"
              title={tSmtView("goSecretariat")}
            >
              ↩ {tSmtView("goSecretariat")}
            </button>
          ) : null}
          {notifications != null ? (
            <div className="flex shrink-0 items-center">{notifications}</div>
          ) : null}
          <div className="inline-flex h-8 items-center rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--material-thin)] px-1 sm:h-9 sm:px-1.5">
            <LanguageSwitcher compact className="flex min-w-0" />
          </div>
          <ChromePreferencesMenu
            account={{
              userName,
              userEmail,
              profilePictureUrl,
              profileHref,
              conferenceLine,
              showDelegateHubLink,
            }}
          />
        </div>
      </div>
    </header>
  );
}
