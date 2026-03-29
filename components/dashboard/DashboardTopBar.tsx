import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";
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
}: {
  userName: string;
  userEmail: string;
  conferenceLine: string | null;
  showSeamunLogo: boolean;
  appName: string;
  notifications?: ReactNode;
}) {
  const initials = initialsFromName(userName, userEmail);

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200/80 bg-[#f4f6fb]/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <Link
          href="/profile"
          className="flex shrink-0 items-center gap-2 lg:hidden"
          aria-label={`${appName} home`}
        >
          {showSeamunLogo ? (
            <img
              src="/seamun-i-2027-logo.png"
              alt=""
              className="h-9 w-9 rounded-xl object-contain"
            />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-[0.65rem] font-bold text-white shadow-md"
              aria-hidden
            >
              IM
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1 basis-[min(100%,12rem)] sm:flex-[1_1_40%]">
          <DashboardSearch />
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:ml-0 sm:flex-nowrap sm:gap-3">
          {conferenceLine ? (
            <p className="hidden max-w-[200px] truncate text-xs font-medium text-violet-700/90 dark:text-violet-300/90 lg:block">
              {conferenceLine}
            </p>
          ) : null}
          <time
            className="hidden text-sm text-slate-500 dark:text-zinc-400 md:block"
            dateTime={new Date().toISOString()}
          >
            {formatHeaderDate(new Date())}
          </time>
          {notifications ?? null}
          <ThemeSelector />
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white py-1.5 pl-1.5 pr-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <Link
              href="/profile"
              className="flex min-w-0 items-center gap-2.5 rounded-xl pr-1 transition hover:bg-slate-50 dark:hover:bg-zinc-800"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-xs font-bold text-white shadow-inner"
                aria-hidden
              >
                {initials}
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-zinc-100">
                  {userName}
                </p>
                <p className="truncate text-[0.7rem] text-slate-500 dark:text-zinc-400">{userEmail}</p>
              </div>
              <ChevronDown
                className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block"
                strokeWidth={1.75}
                aria-hidden
              />
            </Link>
            <SignOutButton className="border-l border-slate-200 pl-2 text-xs sm:text-sm dark:border-zinc-700" />
          </div>
        </div>
      </div>
    </header>
  );
}
