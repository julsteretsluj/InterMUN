"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { ChairDelegateAvatar } from "@/components/chair/ChairDelegateAvatar";
import {
  ChairDelegateProfileSheetProvider,
  ChairDelegateProfileTrigger,
  type ChairDelegateProfileInfo,
} from "@/components/chair/ChairDelegateProfileSheet";

export type SmtDelegateSearchRow = ChairDelegateProfileInfo & {
  allocationId: string;
  committee: string;
};

function haystack(row: SmtDelegateSearchRow): string {
  return [
    row.name,
    row.username,
    row.email,
    row.country,
    row.countryDisplay,
    row.committee,
    row.school,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function SmtDelegatesSearchClient({ rows }: { rows: SmtDelegateSearchRow[] }) {
  const t = useTranslations("smtDelegatesPage");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const tokens = q.split(/\s+/).filter(Boolean);
    return rows.filter((row) => {
      const hay = haystack(row);
      return tokens.every((token) => hay.includes(token));
    });
  }, [query, rows]);

  return (
    <ChairDelegateProfileSheetProvider>
      <div className="mb-5">
        <label htmlFor="smt-delegate-search" className="sr-only">
          {t("searchLabel")}
        </label>
        <div className="relative max-w-xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted"
            aria-hidden
          />
          <input
            id="smt-delegate-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-[#D1D1D6] bg-white py-2.5 pl-10 pr-3 text-sm text-brand-navy outline-none ring-[#007AFF] placeholder:text-brand-muted focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <p className="mt-2 text-xs text-brand-muted">{t("resultCount", { count: filtered.length })}</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-[#D1D1D6] bg-white px-4 py-8 text-center text-sm text-brand-muted dark:border-zinc-700 dark:bg-zinc-900/50">
          {t("empty")}
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-[#D1D1D6] bg-white px-4 py-8 text-center text-sm text-brand-muted dark:border-zinc-700 dark:bg-zinc-900/50">
          {t("noMatches")}
        </p>
      ) : (
        <ul className="grid list-none gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => {
            const displayName = row.name?.trim() || t("unnamed");
            return (
              <li key={row.allocationId}>
                <ChairDelegateProfileTrigger
                  delegate={row}
                  className="flex h-full w-full items-center gap-3 rounded-[var(--radius-md)] border border-[#D1D1D6] bg-[color-mix(in_srgb,#FBFBFD_88%,white)] px-4 py-3 text-left shadow-[var(--dashboard-shadow)] transition-[transform,box-shadow] duration-[var(--dur-base)] hover:-translate-y-0.5 hover:shadow-[var(--dashboard-shadow-hover)] dark:border-zinc-700 dark:bg-zinc-900/60"
                >
                  <ChairDelegateAvatar
                    name={displayName}
                    profilePictureUrl={row.profilePictureUrl}
                    size="md"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-sm font-semibold text-brand-navy dark:text-zinc-50">
                      {displayName}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-brand-muted">
                      {row.countryDisplay || row.country}
                      {row.committee ? ` · ${row.committee}` : ""}
                    </span>
                    {row.email ? (
                      <span className="mt-0.5 block truncate text-[0.7rem] text-[#6E6E73] dark:text-zinc-500">
                        {row.email}
                      </span>
                    ) : null}
                  </span>
                </ChairDelegateProfileTrigger>
              </li>
            );
          })}
        </ul>
      )}
    </ChairDelegateProfileSheetProvider>
  );
}
