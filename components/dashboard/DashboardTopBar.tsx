import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";
import { DashboardBrandLogos } from "@/components/dashboard/DashboardBrandLogos";
import { ThemeSelector } from "@/components/ThemeSelector";
import { DashboardSearch } from "@/components/dashboard/DashboardSearch";

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

function formatHeaderDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function DashboardTopBar({
  userName,
  userEmail,
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
  const initials = initialsFromName(userName, userEmail);

  return (
    <header className="sticky top-0 z-20 flex shrink-0 flex-col border-b border-slate-200/70 bg-brand-cream/90 backdrop-blur-md dark:border-discord-divider dark:bg-discord-app/95 dark:backdrop-blur-md dark:shadow-[0_1px_0_rgba(0,0,0,0.2)]">
      <div className="orbit-rail-h" aria-hidden />
      <div className="flex w-full flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
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
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:ml-0 sm:flex-nowrap sm:gap-3">
          {showDelegateHubLink ? (
            <Link
              href="/delegate"
              className="hidden rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors duration-200 hover:border-brand-accent/45 hover:bg-brand-accent/10 dark:border-discord-divider dark:bg-discord-elevated dark:text-zinc-100 dark:hover:bg-[color:var(--discord-hover-bg)] sm:inline-flex"
            >
              📄 Delegate hub
            </Link>
          ) : null}
          {conferenceLine ? (
            <p className="hidden max-w-[200px] truncate text-xs font-semibold text-brand-diplomatic lg:block">
              {conferenceLine}
            </p>
          ) : null}
          <time
            className="hidden text-sm text-slate-500 dark:text-discord-muted md:block"
            dateTime={new Date().toISOString()}
          >
            {formatHeaderDate(new Date())}
          </time>
          {notifications ?? null}
          <ThemeSelector />
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white py-1.5 pl-1.5 pr-2 shadow-sm dark:border-discord-divider dark:bg-discord-elevated">
            <Link
              href={profileHref}
              className="flex min-w-0 items-center gap-2.5 rounded-xl pr-1 transition-colors duration-150 ease-out hover:bg-slate-50 dark:hover:bg-[color:var(--discord-hover-bg)]"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[color:var(--logo-blue)] via-[color:var(--logo-magenta)] to-[color:var(--logo-orange)] text-xs font-bold text-white shadow-inner"
                aria-hidden
              >
                {initials}
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-zinc-100">
                  {userName}
                </p>
                <p className="truncate text-[0.7rem] text-slate-500 dark:text-discord-muted">{userEmail}</p>
              </div>
              <ChevronDown
                className="hidden h-4 w-4 shrink-0 text-slate-400 dark:text-discord-muted sm:block"
                strokeWidth={1.75}
                aria-hidden
              />
            </Link>
            <SignOutButton className="border-l border-slate-200 pl-2 text-xs sm:text-sm dark:border-discord-divider" />
          </div>
        </div>
      </div>
    </header>
  );
}
