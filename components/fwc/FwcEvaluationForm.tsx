// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FwcDirectiveListItem } from "@/app/actions/fwcCrisis";
import { evaluateFwcDirective } from "@/app/actions/fwcCrisis";
import { fillFwcEvaluationPrompt } from "@/lib/fwc/evaluation-prompt";
import {
  FWC_EVALUATION_CRITERIA,
  FWC_METER_KEYS,
  FWC_OVERALL_VERDICTS,
  type FwcEvaluationCriterion,
  type FwcEvaluationPayload,
  type FwcMeterKey,
  type FwcOverallVerdict,
} from "@/lib/fwc/types";
import {
  FWC_CRITERION_LABELS,
  FWC_DIRECTIVE_TYPE_LABELS,
  FWC_METER_LABELS,
  FWC_VERDICT_LABELS,
} from "@/lib/fwc/ui-labels";

function linesToList(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function assetsSummary(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.summary === "string") return obj.summary;
    try {
      return JSON.stringify(obj);
    } catch {
      return "";
    }
  }
  return "";
}

export function FwcEvaluationForm({
  conferenceId,
  directive,
  submitterName,
  portfolio,
  onEvaluated,
}: {
  conferenceId: string;
  directive: FwcDirectiveListItem;
  submitterName: string;
  portfolio: string;
  onEvaluated?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [timeOfDayBlock, setTimeOfDayBlock] = useState("Afternoon");
  const [scores, setScores] = useState<Record<FwcEvaluationCriterion, number>>({
    realism: 3,
    spatial: 3,
    portfolio: 3,
    narrative: 3,
    balance: 3,
  });
  const [verdict, setVerdict] = useState<FwcOverallVerdict>("APPROVED");
  const [strengths, setStrengths] = useState("");
  const [flaws, setFlaws] = useState("");
  const [resolutionTime, setResolutionTime] = useState("");
  const [evidenceOutput, setEvidenceOutput] = useState("");
  const [mapMeterImpact, setMapMeterImpact] = useState("");
  const [revisionGuidance, setRevisionGuidance] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [meterDeltas, setMeterDeltas] = useState<Partial<Record<FwcMeterKey, string>>>({});

  const viability = useMemo(
    () => FWC_EVALUATION_CRITERIA.reduce((sum, key) => sum + scores[key], 0),
    [scores]
  );

  const prompt = useMemo(
    () =>
      fillFwcEvaluationPrompt({
        directiveType: directive.directive_type,
        submitterName,
        portfolio,
        targetGrid: directive.target_grid,
        requestBody: directive.request_body,
        assetsAndPowers: assetsSummary(directive.assets_and_powers),
        reason: directive.reason,
        timeOfDayBlock,
      }),
    [directive, submitterName, portfolio, timeOfDayBlock]
  );

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the evaluation prompt.");
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const evaluation: FwcEvaluationPayload = {
      overall_verdict: verdict,
      viability_score: viability,
      criterion_scores: { ...scores },
      strengths: linesToList(strengths),
      realism_and_logistical_flaws: linesToList(flaws),
      recommended_resolution: {
        in_game_time_of_resolution: resolutionTime.trim(),
        evidence_output: evidenceOutput.trim(),
        map_and_meter_impact: mapMeterImpact.trim(),
      },
      chair_revision_guidance: revisionGuidance.trim(),
    };

    const deltas: Partial<Record<FwcMeterKey, number>> = {};
    for (const key of FWC_METER_KEYS) {
      const raw = meterDeltas[key]?.trim();
      if (!raw) continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n === 0) continue;
      deltas[key] = Math.round(n);
    }

    startTransition(async () => {
      const result = await evaluateFwcDirective({
        conferenceId,
        directiveId: directive.id,
        evaluation,
        resolutionDetails: resolutionDetails || null,
        meterDeltas: Object.keys(deltas).length > 0 ? deltas : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(`Saved as ${FWC_VERDICT_LABELS[verdict]}.`);
      onEvaluated?.();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-[16px] border border-[#D1D1D6] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-[-0.01em] text-[#1D1D1F]">
          Evaluate: {directive.title}
        </h3>
        <p className="text-sm text-[#6E6E73]">
          {FWC_DIRECTIVE_TYPE_LABELS[directive.directive_type]} · {submitterName}
          {directive.target_grid ? ` · Grid ${directive.target_grid}` : ""}
        </p>
      </div>

      <div className="rounded-[12px] bg-[#F2F2F7] px-4 py-3 text-sm leading-relaxed text-[#1D1D1F]">
        <p className="whitespace-pre-wrap">{directive.request_body}</p>
        {directive.reason ? (
          <p className="mt-2 text-[#6E6E73]">
            <span className="font-semibold text-[#1D1D1F]">Reason: </span>
            {directive.reason}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
            In-game time block
          </span>
          <select
            value={timeOfDayBlock}
            onChange={(e) => setTimeOfDayBlock(e.target.value)}
            disabled={pending}
            className="mun-field w-full"
          >
            {["Morning", "Afternoon", "Evening"].map((block) => (
              <option key={block} value={block}>
                {block}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={copyPrompt}
          className="rounded-[980px] border border-[#D1D1D6] bg-[#F2F2F7] px-4 py-2.5 text-sm font-semibold text-[#1D1D1F]"
        >
          {copied ? "Copied" : "Copy prompt"}
        </button>
      </div>

      <details className="rounded-[12px] border border-[#D1D1D6] bg-[#F2F2F7]/40 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#1D1D1F]">
          Filled Backroom prompt
        </summary>
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#6E6E73]">
          {prompt}
        </pre>
      </details>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
          Criterion scores (1–5) · viability {viability}/25
        </legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {FWC_EVALUATION_CRITERIA.map((key) => (
            <label key={key} className="block space-y-1.5">
              <span className="text-xs font-medium text-[#6E6E73]">{FWC_CRITERION_LABELS[key]}</span>
              <select
                value={scores[key]}
                disabled={pending}
                onChange={(e) =>
                  setScores((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                }
                className="mun-field w-full"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
          Overall verdict
        </span>
        <select
          value={verdict}
          disabled={pending}
          onChange={(e) => setVerdict(e.target.value as FwcOverallVerdict)}
          className="mun-field w-full"
        >
          {FWC_OVERALL_VERDICTS.map((v) => (
            <option key={v} value={v}>
              {FWC_VERDICT_LABELS[v]}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
            Strengths (one per line)
          </span>
          <textarea
            rows={3}
            value={strengths}
            disabled={pending}
            onChange={(e) => setStrengths(e.target.value)}
            className="mun-field w-full resize-y"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
            Realism & logistical flaws
          </span>
          <textarea
            rows={3}
            value={flaws}
            disabled={pending}
            onChange={(e) => setFlaws(e.target.value)}
            className="mun-field w-full resize-y"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
            Resolution time
          </span>
          <input
            value={resolutionTime}
            disabled={pending}
            onChange={(e) => setResolutionTime(e.target.value)}
            className="mun-field w-full"
            placeholder="Start of Afternoon Block"
          />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
            Evidence / intelligence output
          </span>
          <input
            value={evidenceOutput}
            disabled={pending}
            onChange={(e) => setEvidenceOutput(e.target.value)}
            className="mun-field w-full"
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
          Map & meter impact
        </span>
        <textarea
          rows={2}
          value={mapMeterImpact}
          disabled={pending}
          onChange={(e) => setMapMeterImpact(e.target.value)}
          className="mun-field w-full resize-y"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
          Chair revision guidance
        </span>
        <textarea
          rows={2}
          value={revisionGuidance}
          disabled={pending}
          onChange={(e) => setRevisionGuidance(e.target.value)}
          className="mun-field w-full resize-y"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
          Public resolution details
        </span>
        <textarea
          rows={2}
          value={resolutionDetails}
          disabled={pending}
          onChange={(e) => setResolutionDetails(e.target.value)}
          className="mun-field w-full resize-y"
          placeholder="Shown on cabinet/press outcomes when appropriate"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
          Optional meter deltas
        </legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FWC_METER_KEYS.map((key) => (
            <label key={key} className="block space-y-1.5">
              <span className="text-xs text-[#6E6E73]">{FWC_METER_LABELS[key]}</span>
              <input
                type="number"
                step={1}
                value={meterDeltas[key] ?? ""}
                disabled={pending}
                onChange={(e) =>
                  setMeterDeltas((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="mun-field w-full"
                placeholder="0"
              />
            </label>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p className="text-sm text-[#B71C1C]" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-sm text-[#1B5E20]" role="status">
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-[980px] bg-[#007AFF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0077ED] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save evaluation"}
      </button>
    </form>
  );
}
