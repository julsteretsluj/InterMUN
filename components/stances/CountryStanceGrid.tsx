// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useTranslations } from "next-intl";
import {
  COUNTRY_STANCE_CYCLE,
  cycleCountryStance,
  type CountryStanceLabel,
  type CountryStanceMap,
} from "@/lib/country-stance";
import { cn } from "@/lib/utils";

const STANCE_COLORS: Record<CountryStanceLabel, string> = {
  support: "bg-emerald-500/80 text-white",
  oppose: "bg-rose-500/80 text-white",
  neutral: "bg-zinc-400/80 text-white",
  undecided: "bg-amber-400/90 text-zinc-900",
};

export function CountryStanceGrid({
  countries,
  stances,
  canEdit,
  onChange,
}: {
  countries: string[];
  stances: CountryStanceMap;
  canEdit: boolean;
  onChange?: (next: CountryStanceMap) => void;
}) {
  const t = useTranslations("stances");

  if (countries.length === 0) {
    return <p className="text-sm text-brand-muted">{t("countryGridEmpty")}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {countries.map((country) => {
        const stance = stances[country] ?? "undecided";
        const label = t(`countryStance_${stance}`);
        return (
          <button
            key={country}
            type="button"
            disabled={!canEdit}
            onClick={() => {
              if (!canEdit || !onChange) return;
              const nextStance = cycleCountryStance(stance);
              onChange({ ...stances, [country]: nextStance });
            }}
            className={cn(
              "rounded-lg px-2 py-2 text-center text-xs font-semibold transition",
              STANCE_COLORS[stance],
              canEdit ? "hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]" : "cursor-default opacity-95"
            )}
            aria-label={t("countryStanceAria", { country, stance: label })}
          >
            <span className="block truncate">{country}</span>
            <span className="mt-0.5 block text-[0.65rem] font-normal opacity-90">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { COUNTRY_STANCE_CYCLE, STANCE_COLORS };
