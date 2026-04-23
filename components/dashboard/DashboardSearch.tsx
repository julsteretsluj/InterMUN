"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

export function DashboardSearch() {
  const t = useTranslations("dashboardSearch");
  return (
    <label className="relative block w-full max-w-xl">
      <span className="sr-only">{t("aria")}</span>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-[1.05rem] w-[1.05rem] -translate-y-1/2 text-slate-400 dark:text-discord-muted"
        strokeWidth={1.75}
        aria-hidden
      />
      <input
        type="search"
        placeholder={t("placeholder")}
        className="w-full rounded-full border border-slate-200/90 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-800 shadow-sm transition-colors duration-200 placeholder:text-slate-400 focus:border-brand-accent/55 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 dark:border-discord-divider dark:bg-discord-elevated dark:text-zinc-100 dark:placeholder:text-discord-muted dark:focus:border-discord-blurple/55 dark:focus:ring-discord-blurple/25"
        autoComplete="off"
      />
    </label>
  );
}
