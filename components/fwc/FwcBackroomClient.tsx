// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState } from "react";
import type { FwcDirectiveListItem } from "@/app/actions/fwcCrisis";
import { FwcEvaluationForm } from "@/components/fwc/FwcEvaluationForm";
import { FwcMetersEditor } from "@/components/fwc/FwcMetersEditor";
import {
  FwcMovementQueue,
  type FwcMovementQueueItem,
} from "@/components/fwc/FwcMovementQueue";
import { FWC_METER_KEYS, type FwcMeters } from "@/lib/fwc/types";
import {
  FWC_APPROVAL_STATUS_LABELS,
  FWC_DIRECTIVE_TYPE_LABELS,
} from "@/lib/fwc/ui-labels";
import { cn } from "@/lib/utils";

export type FwcBackroomSeatMeta = {
  id: string;
  country: string;
  displayName: string;
  portfolio: string;
};

export function FwcBackroomClient({
  conferenceId,
  directives,
  movements,
  meters,
  seatsById,
}: {
  conferenceId: string;
  directives: FwcDirectiveListItem[];
  movements: FwcMovementQueueItem[];
  meters: FwcMeters;
  seatsById: Record<string, FwcBackroomSeatMeta>;
}) {
  const pending = useMemo(
    () => directives.filter((row) => row.approval_status === "pending"),
    [directives]
  );
  const [selectedId, setSelectedId] = useState<string | null>(pending[0]?.id ?? null);

  const selected = pending.find((row) => row.id === selectedId) ?? pending[0] ?? null;

  const submitterMeta = selected?.submitter_allocation_id
    ? seatsById[selected.submitter_allocation_id]
    : null;
  const submitterName =
    selected?.anonymity_status === "active"
      ? `${submitterMeta?.displayName ?? "Unknown"} (anonymous to floor)`
      : (submitterMeta?.displayName ?? "Unknown");
  const portfolio = submitterMeta?.portfolio ?? "";

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <section className="space-y-3 rounded-[16px] border border-[#D1D1D6] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <div>
            <h3 className="text-base font-semibold tracking-[-0.01em] text-[#1D1D1F]">
              Pending directives
            </h3>
            <p className="mt-1 text-sm text-[#6E6E73]">Rapid crisis actions sort first.</p>
          </div>
          {pending.length === 0 ? (
            <p className="rounded-[12px] border border-dashed border-[#D1D1D6] px-4 py-8 text-center text-sm text-[#6E6E73]">
              Queue is clear.
            </p>
          ) : (
            <ul className="space-y-2">
              {pending.map((row) => {
                const active = selected?.id === row.id;
                const name = row.submitter_allocation_id
                  ? (seatsById[row.submitter_allocation_id]?.displayName ?? "Unknown")
                  : "Anonymous";
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={cn(
                        "w-full rounded-[12px] border px-3 py-3 text-left transition-colors",
                        active
                          ? "border-[#007AFF] bg-[#007AFF]/08"
                          : "border-[#D1D1D6] bg-[#F2F2F7]/40 hover:border-[#AEAEB2]"
                      )}
                    >
                      <p className="font-semibold text-[#1D1D1F]">{row.title}</p>
                      <p className="mt-1 text-xs text-[#6E6E73]">
                        {FWC_DIRECTIVE_TYPE_LABELS[row.directive_type]} · {name}
                        {row.anonymity_status === "active" ? " · anon" : ""}
                        {" · "}
                        {FWC_APPROVAL_STATUS_LABELS[row.approval_status]}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="min-w-0">
          {selected ? (
            <FwcEvaluationForm
              key={selected.id}
              conferenceId={conferenceId}
              directive={selected}
              submitterName={submitterName}
              portfolio={portfolio}
              onEvaluated={() => {
                const remaining = pending.filter((row) => row.id !== selected.id);
                setSelectedId(remaining[0]?.id ?? null);
              }}
            />
          ) : (
            <div className="rounded-[16px] border border-dashed border-[#D1D1D6] bg-white px-5 py-12 text-center text-sm text-[#6E6E73]">
              Select a pending directive to fill the five-point Backroom evaluation.
            </div>
          )}
        </div>
      </div>

      <FwcMovementQueue conferenceId={conferenceId} movements={movements} />
      <FwcMetersEditor
        key={FWC_METER_KEYS.map((key) => meters[key]).join("-")}
        conferenceId={conferenceId}
        initialMeters={meters}
      />
    </div>
  );
}
