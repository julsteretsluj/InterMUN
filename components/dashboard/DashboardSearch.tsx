"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

export function DashboardSearch() {
  const t = useTranslations("dashboardSearch");
  return (
    <label className="relative block w-full max-w-xl">
      <span className="sr-only">{t("aria")}</span>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-[1.05rem] w-[1.05rem] -translate-y-1/2 text-brand-muted"
        strokeWidth={1.75}
        aria-hidden
      />
      <input
        type="search"
        placeholder={t("placeholder")}
        className="w-full rounded-[var(--radius-pill)] border border-[var(--hairline)] bg-[var(--material-thin)] py-2.5 pl-11 pr-4 text-sm text-brand-navy transition-apple placeholder:text-brand-muted focus:border-[color:color-mix(in_srgb,var(--accent)_45%,var(--hairline))] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--accent)_25%,transparent)]"
        autoComplete="off"
      />
    </label>
  );
}
