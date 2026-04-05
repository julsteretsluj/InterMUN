"use client";

import { useEffect, useState } from "react";
import {
  PROFICIENCY_BAND_LABEL,
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
};

export function RubricCriterionPicker({ criterion, initialScore, onScoreChange }: Props) {
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
    onScoreChange(criterion.key, score);
  }, [score, criterion.key, onScoreChange]);

  function selectBand(b: ProficiencyBandId) {
    setBand(b);
    setTier(null);
  }

  function selectTier(t: BandTier) {
    setTier(t);
  }

  return (
    <fieldset className="rounded-lg border border-white/10 bg-black/20 p-2 space-y-2">
      <legend className="text-sm font-semibold text-brand-navy px-1">{criterion.label}</legend>
      <input type="hidden" name={`score_${criterion.key}`} value={score ?? ""} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {PROFICIENCY_BAND_ORDER.map((bandId, i) => {
          const tone =
            bandId === "beginning"
              ? "border-rose-200/80 bg-rose-50/70 dark:border-rose-400/30 dark:bg-rose-950/20"
              : bandId === "developing"
                ? "border-amber-200/80 bg-amber-50/70 dark:border-amber-400/30 dark:bg-amber-950/20"
                : bandId === "proficient"
                  ? "border-sky-200/80 bg-sky-50/70 dark:border-sky-400/30 dark:bg-sky-950/20"
                  : "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-400/30 dark:bg-emerald-950/20";
          const selected = band === bandId;
          return (
            <button
              key={bandId}
              type="button"
              onClick={() => selectBand(bandId)}
              className={`text-left flex gap-1.5 cursor-pointer rounded-lg border p-2 transition-[box-shadow] ${tone} ${
                selected ? "ring-2 ring-brand-gold/60 border-brand-gold/70" : "hover:border-brand-navy/25"
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full border ${selected ? "border-brand-gold bg-brand-gold" : "border-brand-navy/30"}`}
                aria-hidden
              />
              <span className="min-w-0 text-xs leading-snug">
                <span className="font-semibold text-brand-navy">{PROFICIENCY_BAND_LABEL[bandId]}</span>
                <span className="block text-brand-navy/80 mt-0.5">{criterion.bandDescriptions[i]}</span>
              </span>
            </button>
          );
        })}
      </div>
      {band ? (
        <div className="rounded-lg border border-brand-gold/30 bg-black/15 p-2 space-y-2">
          <p className="text-xs font-medium text-brand-navy" id={`tier-prompt-${criterion.key}`}>
            {tier
              ? `Locked in: ${PROFICIENCY_BAND_LABEL[band]} — ${tier === "low" ? "Low" : "High"} (${score})`
              : `Pick low or high within ${PROFICIENCY_BAND_LABEL[band]} (points on the 1–8 scale).`}
          </p>
          <div className="flex flex-wrap gap-2">
            {(["low", "high"] as const).map((t) => {
              const { low, high } = bandScoreRange(band);
              const pts = t === "low" ? low : high;
              const active = tier === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => selectTier(t)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    active
                      ? "bg-brand-gold text-white border-brand-gold"
                      : "bg-white/10 text-brand-navy border-white/20 hover:border-brand-gold/50"
                  }`}
                >
                  {t === "low" ? "Low" : "High"} ({pts})
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
