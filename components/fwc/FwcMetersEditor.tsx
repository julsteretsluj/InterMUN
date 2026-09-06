// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFwcMeters } from "@/app/actions/fwcCrisis";
import { FWC_METER_KEYS, type FwcMeterKey, type FwcMeters } from "@/lib/fwc/types";
import { FWC_METER_LABELS, FWC_METER_RANGES } from "@/lib/fwc/ui-labels";

export function FwcMetersEditor({
  conferenceId,
  initialMeters,
}: {
  conferenceId: string;
  initialMeters: FwcMeters;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [meters, setMeters] = useState<FwcMeters>(initialMeters);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dirty = useMemo(
    () => FWC_METER_KEYS.some((key) => meters[key] !== initialMeters[key]),
    [meters, initialMeters]
  );

  function setKey(key: FwcMeterKey, raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const { min, max } = FWC_METER_RANGES[key];
    setMeters((prev) => ({ ...prev, [key]: Math.min(max, Math.max(min, Math.round(n))) }));
  }

  function onSave() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await updateFwcMeters({ conferenceId, meters });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMeters(result.data.meters);
      setNotice("Meters updated.");
      router.refresh();
    });
  }

  function onReset() {
    setMeters(initialMeters);
    setError(null);
    setNotice(null);
  }

  return (
    <section className="space-y-4 rounded-[16px] border border-[#D1D1D6] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-[-0.01em] text-[#1D1D1F]">Crisis meters</h3>
          <p className="mt-1 text-sm text-[#6E6E73]">Adjust chamber-wide Hawkins risk meters.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={pending || !dirty}
            className="rounded-[980px] border border-[#D1D1D6] bg-[#F2F2F7] px-4 py-2 text-sm font-semibold text-[#1D1D1F] disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending || !dirty}
            className="rounded-[980px] bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077ED] disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save meters"}
          </button>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {FWC_METER_KEYS.map((key) => {
          const { min, max } = FWC_METER_RANGES[key];
          return (
            <li key={key} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={`fwc-meter-${key}`} className="text-sm font-medium text-[#1D1D1F]">
                  {FWC_METER_LABELS[key]}
                </label>
                <span className="text-sm font-semibold tabular-nums text-[#007AFF]">{meters[key]}</span>
              </div>
              <input
                id={`fwc-meter-${key}`}
                type="range"
                min={min}
                max={max}
                step={1}
                value={meters[key]}
                disabled={pending}
                onChange={(e) => setKey(key, e.target.value)}
                className="w-full accent-[#007AFF]"
              />
              <input
                type="number"
                min={min}
                max={max}
                value={meters[key]}
                disabled={pending}
                onChange={(e) => setKey(key, e.target.value)}
                className="mun-field w-full"
              />
            </li>
          );
        })}
      </ul>

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
    </section>
  );
}
