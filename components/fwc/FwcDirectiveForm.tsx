// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitFwcDirective } from "@/app/actions/fwcCrisis";
import {
  FWC_ANONYMITY_FORBIDDEN_DIRECTIVE_TYPES,
  FWC_DIRECTIVE_TYPES,
  type FwcDirectiveType,
} from "@/lib/fwc/types";
import { FWC_DIRECTIVE_TYPE_LABELS } from "@/lib/fwc/ui-labels";

export type FwcCoSubmitterOption = {
  id: string;
  label: string;
};

export function FwcDirectiveForm({
  conferenceId,
  anonymityEligible,
  anonymityUsedSession,
  coSubmitterOptions,
}: {
  conferenceId: string;
  anonymityEligible: boolean;
  anonymityUsedSession: boolean;
  coSubmitterOptions: FwcCoSubmitterOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [directiveType, setDirectiveType] = useState<FwcDirectiveType>("personal");
  const [title, setTitle] = useState("");
  const [targetGrid, setTargetGrid] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [assetsAndPowers, setAssetsAndPowers] = useState("");
  const [reason, setReason] = useState("");
  const [anonymity, setAnonymity] = useState(false);
  const [coSubmitters, setCoSubmitters] = useState<string[]>([]);

  const anonymityAllowed = useMemo(() => {
    if (!anonymityEligible || anonymityUsedSession) return false;
    return !(FWC_ANONYMITY_FORBIDDEN_DIRECTIVE_TYPES as readonly FwcDirectiveType[]).includes(
      directiveType
    );
  }, [anonymityEligible, anonymityUsedSession, directiveType]);

  function toggleCo(id: string) {
    setCoSubmitters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 5 ? prev : [...prev, id]
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await submitFwcDirective({
        conferenceId,
        title,
        directiveType,
        requestBody,
        reason: reason || null,
        targetGrid: targetGrid || null,
        assetsAndPowers: assetsAndPowers || null,
        anonymity: anonymityAllowed && anonymity,
        coSubmitterAllocationIds: directiveType === "joint" ? coSubmitters : [],
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setTargetGrid("");
      setRequestBody("");
      setAssetsAndPowers("");
      setReason("");
      setAnonymity(false);
      setCoSubmitters([]);
      setNotice("Directive submitted to the Backroom.");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-[16px] border border-[#D1D1D6] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
    >
      <div>
        <h3 className="text-base font-semibold tracking-[-0.01em] text-[#1D1D1F]">Submit a directive</h3>
        <p className="mt-1 text-sm text-[#6E6E73]">
          Personal, joint, cabinet, press, or rapid crisis actions go to the chair Backroom first.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            className="mun-field w-full"
            placeholder="Short operational title"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">Type</span>
          <select
            value={directiveType}
            onChange={(e) => {
              const next = e.target.value as FwcDirectiveType;
              setDirectiveType(next);
              if ((FWC_ANONYMITY_FORBIDDEN_DIRECTIVE_TYPES as readonly string[]).includes(next)) {
                setAnonymity(false);
              }
              if (next !== "joint") setCoSubmitters([]);
            }}
            disabled={pending}
            className="mun-field w-full"
          >
            {FWC_DIRECTIVE_TYPES.map((type) => (
              <option key={type} value={type}>
                {FWC_DIRECTIVE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
            Target grid
          </span>
          <input
            value={targetGrid}
            onChange={(e) => setTargetGrid(e.target.value)}
            disabled={pending}
            className="mun-field w-full"
            placeholder="e.g. B2 or J10–K11"
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
          Request / action
        </span>
        <textarea
          required
          rows={5}
          value={requestBody}
          onChange={(e) => setRequestBody(e.target.value)}
          disabled={pending}
          className="mun-field w-full resize-y"
          placeholder="What you intend to do, with timing and assets"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
          Assets & powers
        </span>
        <textarea
          rows={3}
          value={assetsAndPowers}
          onChange={(e) => setAssetsAndPowers(e.target.value)}
          disabled={pending}
          className="mun-field w-full resize-y"
          placeholder="Clearance, units, vehicles, powers invoked"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">Reason</span>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={pending}
          className="mun-field w-full resize-y"
          placeholder="Why this action, why now"
        />
      </label>

      {directiveType === "joint" ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
            Co-submitters (2–5)
          </legend>
          {coSubmitterOptions.length === 0 ? (
            <p className="text-sm text-[#AEAEB2]">No other FWC characters are seated yet.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {coSubmitterOptions.map((opt) => {
                const checked = coSubmitters.includes(opt.id);
                return (
                  <li key={opt.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-[12px] border border-[#D1D1D6] bg-[#F2F2F7]/60 px-3 py-2 text-sm text-[#1D1D1F]">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={pending || (!checked && coSubmitters.length >= 5)}
                        onChange={() => toggleCo(opt.id)}
                        className="accent-[#007AFF]"
                      />
                      <span className="truncate">{opt.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>
      ) : null}

      <label
        className={`flex items-start gap-3 rounded-[12px] border border-[#D1D1D6] px-3 py-3 text-sm ${
          anonymityAllowed ? "bg-[#F2F2F7]/50 text-[#1D1D1F]" : "bg-white text-[#AEAEB2]"
        }`}
      >
        <input
          type="checkbox"
          checked={anonymityAllowed && anonymity}
          disabled={pending || !anonymityAllowed}
          onChange={(e) => setAnonymity(e.target.checked)}
          className="mt-0.5 accent-[#007AFF]"
        />
        <span>
          <span className="font-semibold">Submit anonymously</span>
          <span className="mt-0.5 block text-[#6E6E73]">
            {!anonymityEligible
              ? "This character cannot use anonymity."
              : anonymityUsedSession
                ? "Anonymity already used this session."
                : !anonymityAllowed
                  ? "Cabinet and rapid actions cannot be anonymized."
                  : "Once per session on personal, joint, or press-release directives."}
          </span>
        </span>
      </label>

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
        {pending ? "Submitting…" : "Submit directive"}
      </button>
    </form>
  );
}
