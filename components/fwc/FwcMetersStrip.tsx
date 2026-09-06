// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { FWC_METER_KEYS, type FwcMeters } from "@/lib/fwc/types";
import { FWC_METER_LABELS, FWC_METER_RANGES } from "@/lib/fwc/ui-labels";

export function FwcMetersStrip({ meters }: { meters: FwcMeters }) {
  return (
    <section
      aria-label="Hawkins crisis meters"
      className="rounded-[16px] border border-[#D1D1D6] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:p-5"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-[#1D1D1F]">Crisis meters</h3>
        <p className="text-xs text-[#AEAEB2]">Read-only</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FWC_METER_KEYS.map((key) => {
          const { min, max } = FWC_METER_RANGES[key];
          const value = meters[key];
          const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
          return (
            <li key={key} className="min-w-0 space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-medium text-[#6E6E73]">{FWC_METER_LABELS[key]}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[#1D1D1F]">
                  {value}
                  <span className="font-normal text-[#AEAEB2]">/{max}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#F2F2F7]">
                <div
                  className="h-full rounded-full bg-[#007AFF]"
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
