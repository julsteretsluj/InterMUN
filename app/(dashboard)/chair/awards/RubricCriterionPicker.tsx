"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  PROFICIENCY_BAND_ORDER,
  bandAndTierToScore,
  bandScoreRange,
  scoreToBandAndTier,
  type BandTier,
  type ProficiencyBandId,
  type RubricCriterion,
} from "@/lib/seamuns-award-scoring";

type Props = {
  criterion: RubricCriterion;
  initialScore: number;
  onScoreChange: (key: string, score: number | null) => void;
  disabled?: boolean;
};

export function RubricCriterionPicker({ criterion, initialScore, onScoreChange, disabled = false }: Props) {
  const t = useTranslations("awardsRubric");
  const init = scoreToBandAndTier(initialScore);
  const [band, setBand] = useState<ProficiencyBandId | null>(init?.band ?? null);
  const [tier, setTier] = useState<BandTier | null>(init?.tier ?? null);

  useEffect(() => {
    const next = scoreToBandAndTier(initialScore);
    if (next) {
      setBand(next.band);
      setTier(next.tier);
    } else {
      setBand(null);
      setTier(null);
    }
  }, [initialScore]);

  const score = band && tier ? bandAndTierToScore(band, tier) : null;

  useEffect(() => {
    if (disabled) return;
    onScoreChange(criterion.key, score);
  }, [score, criterion.key, onScoreChange, disabled]);

  function selectBand(b: ProficiencyBandId) {
    setBand(b);
    setTier(null);
  }

  function selectTier(t: BandTier) {
    setTier(t);
  }

  return (
    <fieldset
      className={`rounded-lg border border-white/10 bg-black/20 p-2 space-y-2 ${disabled ? "opacity-65 pointer-events-none" : ""}`}
    >
      <legend className="sr-only">{t(`criteria.${criterion.key}.label`)}</legend>
      <p className="px-1 pt-0.5 text-sm font-semibold text-brand-navy">{t(`criteria.${criterion.key}.label`)}</p>
      <input type="hidden" name={`score_${criterion.key}`} value={score ?? ""} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 xl:auto-rows-fr">
        {PROFICIENCY_BAND_ORDER.map((bandId, i) => {
          const tone =
            bandId === "beginning"
              ? "border-rose-200/80 bg-rose-50/70 dark:border-rose-400/30 dark:bg-rose-950/20"
              : bandId === "developing"
                ? "border-amber-200/80 bg-amber-50/70 dark:border-amber-400/30 dark:bg-amber-950/20"
                : bandId === "proficient"
                  ? "border-logo-cyan/35 bg-logo-cyan/12 dark:border-logo-cyan/35 dark:bg-logo-cyan/12"
                  : "border-brand-accent/25/80 bg-brand-accent/11 dark:border-brand-accent/35 dark:bg-brand-accent/10";
          const selected = band === bandId;
          return (
            <button
              key={bandId}
              type="button"
              onClick={() => selectBand(bandId)}
              className={`text-left flex h-full items-start gap-1.5 cursor-pointer rounded-lg border p-2 transition-[box-shadow] ${tone} ${
                selected ? "ring-2 ring-brand-accent/60 border-brand-accent/70" : "hover:border-brand-navy/25"
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full border ${selected ? "border-brand-accent bg-brand-accent" : "border-brand-navy/30"}`}
                aria-hidden
              />
              <span className="min-w-0 text-xs leading-snug">
                <span className="font-semibold text-brand-navy">{t(`bandHeaders.${i}`)}</span>
                <span className="mt-0.5 block whitespace-normal break-words text-brand-navy/80">
                  {t(`criteria.${criterion.key}.bands.${i}`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {band ? (
        <div className="rounded-lg border border-brand-accent/30 bg-black/15 p-2 space-y-2">
          <p className="text-xs font-medium text-brand-navy" id={`tier-prompt-${criterion.key}`}>
            {tier
              ? t("tierPromptLocked", {
                  band: t(`bandHeaders.${PROFICIENCY_BAND_ORDER.indexOf(band)}`),
                  tier: t(tier === "low" ? "tierLow" : "tierHigh"),
                  score: score ?? "",
                })
              : t("tierPromptPick", {
                  band: t(`bandHeaders.${PROFICIENCY_BAND_ORDER.indexOf(band)}`),
                })}
          </p>
          <div className="flex flex-wrap gap-2">
            {(["low", "high"] as const).map((tierId) => {
              const { low, high } = bandScoreRange(band);
              const pts = tierId === "low" ? low : high;
              const active = tier === tierId;
              return (
                <button
                  key={tierId}
                  type="button"
                  onClick={() => selectTier(tierId)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    active
                      ? "bg-brand-accent text-white border-brand-accent"
                      : "bg-white/10 text-brand-navy border-white/20 hover:border-brand-accent/50"
                  }`}
                >
                  {t(tierId === "low" ? "tierLow" : "tierHigh")} ({pts})
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
