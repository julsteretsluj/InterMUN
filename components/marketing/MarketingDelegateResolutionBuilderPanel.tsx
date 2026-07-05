"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  OPERATIVE_OPENING_PRESETS,
  PREAMBULATORY_OPENING_PRESETS,
  combineClauseSuggestion,
  type ClauseSection,
} from "@/lib/resolution-clause-presets";
import { cn } from "@/lib/utils";

type SuggestionRow = {
  id: string;
  section: ClauseSection;
  opening: string;
  body: string;
  yours?: boolean;
};

const SUGGESTIONS_SEED: SuggestionRow[] = [
  {
    id: "op-1",
    section: "operative",
    opening: "Calls upon",
    body: "Member States to expand climate finance access for vulnerable regions;",
    yours: true,
  },
  {
    id: "pre-1",
    section: "preambulatory",
    opening: "Deeply concerned",
    body: "by the disproportionate impact of climate change on developing nations,",
  },
  {
    id: "op-2",
    section: "operative",
    opening: "Encourages",
    body: "bilateral technology-transfer partnerships between developed and developing Member States;",
  },
];

export function MarketingDelegateResolutionBuilderPanel({ className }: { className?: string }) {
  const t = useTranslations("delegateResolutionBuilder");
  const [section, setSection] = useState<ClauseSection>("operative");
  const [opening, setOpening] = useState("Calls upon");
  const [body, setBody] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>(SUGGESTIONS_SEED);
  const [msg, setMsg] = useState<string | null>(null);

  const presets = section === "preambulatory" ? PREAMBULATORY_OPENING_PRESETS : OPERATIVE_OPENING_PRESETS;
  const preview = useMemo(() => combineClauseSuggestion(opening, body), [opening, body]);

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) {
      setMsg(t("errEmptyBody"));
      return;
    }
    setSuggestions((prev) => [
      {
        id: `s-${Date.now()}`,
        section,
        opening,
        body: trimmed.endsWith(";") ? trimmed : `${trimmed};`,
        yours: true,
      },
      ...prev,
    ]);
    setBody("");
    setMsg(t("okSubmitted"));
  };

  const removeSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((row) => row.id !== id));
  };

  return (
    <section className={cn("mun-card space-y-4 border-white/10", className)}>
      <div>
        <h3 className="font-display text-lg font-semibold text-brand-navy">{t("title")}</h3>
        <p className="mt-1 text-xs leading-relaxed text-brand-muted">{t("introDescription")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="mun-label normal-case">{t("draftResolution")}</span>
          <select className="mun-field" defaultValue="draft-a">
            <option value="draft-a">{t("draftResolutionNumber", { number: 1 })}</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="mun-label normal-case">{t("section")}</span>
          <select
            className="mun-field"
            value={section}
            onChange={(e) => {
              const next = e.target.value as ClauseSection;
              setSection(next);
              setOpening(next === "preambulatory" ? "Deeply concerned" : "Calls upon");
            }}
          >
            <option value="preambulatory">{t("sectionPreambulatory")}</option>
            <option value="operative">{t("sectionOperative")}</option>
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <span className="mun-label normal-case block">{t("openingPresets")}</span>
        <div className="max-h-32 overflow-y-auto rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-2 dark:border-white/10 dark:bg-black/20">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setOpening(preset)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                  opening === preset
                    ? "border-brand-accent bg-brand-accent/15 text-brand-navy"
                    : "border-brand-navy/15 text-brand-muted hover:border-brand-accent/40"
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-brand-muted">{t("openingPhraseLabel")}</span>
          <input
            className="mun-field"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            placeholder={
              section === "preambulatory"
                ? t("openingPlaceholderPreambulatory")
                : t("openingPlaceholderOperative")
            }
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="mun-label normal-case">{t("clauseText")}</span>
        <textarea
          className="mun-field min-h-[100px] resize-y"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("clausePlaceholder")}
        />
      </label>

      <div className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">{t("preview")}</p>
        <p className="mt-1 text-sm text-brand-navy">{preview || t("previewDash")}</p>
      </div>

      {msg ? (
        <p className="text-sm text-brand-diplomatic" role="status">
          {msg}
        </p>
      ) : null}

      <button type="button" onClick={submit} className="mun-btn-primary">
        {t("submitClause")}
      </button>

      <div className="border-t border-[var(--hairline)] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-brand-navy">{t("suggestionsHeading")}</h4>
          <button type="button" className="text-xs text-brand-diplomatic hover:underline">
            {t("refresh")}
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {suggestions.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-brand-navy/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black/15"
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-brand-muted">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5",
                    row.section === "preambulatory"
                      ? "bg-amber-500/15 text-amber-900"
                      : "bg-emerald-500/15 text-emerald-900"
                  )}
                >
                  {row.section === "preambulatory" ? t("badgePreamb") : t("badgeOperative")}
                </span>
                {row.yours ? (
                  <span className="rounded bg-brand-accent/20 px-1.5 py-0.5 text-brand-navy">
                    {t("badgeYours")}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-brand-navy">{combineClauseSuggestion(row.opening, row.body)}</p>
              {row.yours ? (
                <button
                  type="button"
                  onClick={() => removeSuggestion(row.id)}
                  className="mt-2 text-xs text-red-700 hover:underline"
                >
                  {t("delete")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
