"use client";

import { Search } from "lucide-react";

export function DashboardSearch() {
  return (
    <label className="relative block w-full max-w-xl">
      <span className="sr-only">Search</span>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-[1.05rem] w-[1.05rem] -translate-y-1/2 text-slate-400 dark:text-zinc-500"
        strokeWidth={1.75}
        aria-hidden
      />
      <input
        type="search"
        placeholder="Search guides, documents, notes…"
        className="w-full rounded-full border border-slate-200/90 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-800 shadow-sm transition-colors duration-200 placeholder:text-slate-400 focus:border-brand-accent/55 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 dark:border-white/12 dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-brand-accent/55 dark:focus:ring-brand-accent/25"
        autoComplete="off"
      />
    </label>
  );
}
