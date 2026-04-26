import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";
import { DashboardBrandLogos } from "@/components/dashboard/DashboardBrandLogos";
import { ThemeSelector } from "@/components/ThemeSelector";
import { DashboardSearch } from "@/components/dashboard/DashboardSearch";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useLocale, useTranslations } from "next-intl";

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

export function DashboardTopBar({
  userName,
  userEmail,
  profilePictureUrl,
  conferenceLine,
  showSeamunLogo,
  appName,
  notifications,
  showDelegateHubLink,
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
  /** Mobile header logo target (sidebar brand uses the same hub). */
  brandHomeHref?: string;
  /** Account menu target (e.g. SMT uses `/smt/profile`). */
  profileHref?: string;
}) {
  const t = useTranslations("dashboardTopBar");
  const locale = useLocale();
  const initials = initialsFromName(userName, userEmail);

  return (
    <header className="sticky top-0 z-20 flex shrink-0 flex-col border-b border-[var(--hairline)] bg-[var(--material-chrome)] backdrop-blur-2xl backdrop-saturate-150 shadow-[0_1px_0_rgba(0,0,0,0.04)] [transition:backdrop-filter_200ms_var(--ease-apple)] dark:shadow-[0_1px_0_rgba(0,0,0,0.2)]">
      <div className="flex w-full flex-wrap items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-6">
        <Link
          href={brandHomeHref ?? "/profile"}
          className="flex shrink-0 items-center gap-2 lg:hidden"
          aria-label={`${appName} home`}
        >
          <DashboardBrandLogos showConferenceLogo={showSeamunLogo} variant="topbar" />
        </Link>
        <div className="min-w-0 flex-1 basis-[min(100%,12rem)] sm:flex-[1_1_40%]">
          <DashboardSearch />
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 sm:ml-0 sm:flex-nowrap sm:gap-2.5">
          {showDelegateHubLink ? (
            <Link
              href="/delegate"
              className="hidden rounded-[var(--radius-pill)] border border-[var(--hairline)] bg-[var(--material-thin)] px-2.5 py-1.5 text-xs font-semibold text-brand-navy transition-apple hover:border-[color:color-mix(in_srgb,var(--accent)_40%,var(--hairline))] hover:bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] sm:inline-flex"
            >
              📄 {t("delegateHub")}
            </Link>
          ) : null}
          {conferenceLine ? (
            <p className="hidden max-w-[200px] truncate text-xs font-semibold text-brand-diplomatic lg:block">
              {conferenceLine}
            </p>
          ) : null}
          <time
            className="hidden text-sm text-brand-muted md:block"
            dateTime={new Date().toISOString()}
          >
            {formatHeaderDate(new Date(), locale)}
          </time>
          {notifications ?? null}
          <LanguageSwitcher />
          <ThemeSelector />
          <div className="flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--hairline)] bg-[var(--material-thin)] py-1 pl-1 pr-1.5">
            <Link
              href={profileHref}
              className="flex min-w-0 items-center gap-2 rounded-[var(--radius-pill)] pr-1 transition-apple hover:bg-[color:var(--discord-hover-bg)]"
            >
              {profilePictureUrl?.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePictureUrl.trim()}
                  alt={`${userName} profile`}
                  className="h-8 w-8 shrink-0 rounded-[var(--radius-md)] object-cover"
                />
              ) : (
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)] text-xs font-bold text-white"
                  aria-hidden
                >
                  {initials}
                </span>
              )}
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-brand-navy">{userName}</p>
                <p className="truncate text-[0.7rem] text-brand-muted">{userEmail}</p>
              </div>
              <ChevronDown
                className="hidden h-4 w-4 shrink-0 text-brand-muted sm:block"
                strokeWidth={1.75}
                aria-hidden
              />
            </Link>
            <SignOutButton className="border-l border-[var(--hairline)] pl-1.5 text-xs sm:text-sm" />
          </div>
        </div>
      </div>
    </header>
  );
}
