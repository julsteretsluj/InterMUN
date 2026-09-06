// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { FwcDirectiveListItem } from "@/app/actions/fwcCrisis";
import {
  FWC_APPROVAL_STATUS_LABELS,
  FWC_DIRECTIVE_TYPE_LABELS,
} from "@/lib/fwc/ui-labels";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function FwcDirectiveList({
  directives,
  nameByAllocationId,
  viewerAllocationIds,
  compact,
}: {
  directives: FwcDirectiveListItem[];
  nameByAllocationId: Record<string, string>;
  viewerAllocationIds?: string[];
  compact?: boolean;
}) {
  const viewer = new Set(viewerAllocationIds ?? []);

  if (directives.length === 0) {
    return (
      <p className="rounded-[16px] border border-dashed border-[#D1D1D6] bg-white px-5 py-8 text-center text-sm text-[#6E6E73]">
        No directives yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {directives.map((row) => {
        const isOwn =
          (row.submitter_allocation_id && viewer.has(row.submitter_allocation_id)) ||
          (row.co_submitter_allocation_ids ?? []).some((id) => viewer.has(id));
        const submitterLabel =
          row.anonymity_status === "active" && !isOwn
            ? "Anonymous"
            : row.submitter_allocation_id
              ? (nameByAllocationId[row.submitter_allocation_id] ?? "Unknown")
              : "Anonymous";
        const status = FWC_APPROVAL_STATUS_LABELS[row.approval_status];
        const typeLabel = FWC_DIRECTIVE_TYPE_LABELS[row.directive_type];

        return (
          <li
            key={row.id}
            className={cn(
              "rounded-[16px] border border-[#D1D1D6] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
              row.directive_type === "rapid_crisis_action" &&
                row.approval_status === "pending" &&
                "border-[#007AFF]/30"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="font-semibold tracking-[-0.01em] text-[#1D1D1F]">{row.title}</p>
                <p className="text-xs text-[#6E6E73]">
                  {typeLabel}
                  {" · "}
                  {submitterLabel}
                  {row.target_grid ? ` · Grid ${row.target_grid}` : ""}
                  {" · "}
                  {formatWhen(row.created_at)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-[980px] px-3 py-1 text-xs font-semibold",
                  row.approval_status === "pending" && "bg-[#F2F2F7] text-[#6E6E73]",
                  row.approval_status === "approved" && "bg-[#E8F5E9] text-[#1B5E20]",
                  row.approval_status === "approved_with_conditions" && "bg-[#E3F2FD] text-[#0D47A1]",
                  row.approval_status === "rejected" && "bg-[#FFEBEE] text-[#B71C1C]",
                  row.approval_status === "needs_revision" && "bg-[#FFF8E1] text-[#E65100]"
                )}
              >
                {status}
              </span>
            </div>

            {!compact && row.request_body ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#1D1D1F]">
                {row.request_body}
              </p>
            ) : null}

            {!compact && row.resolution_details ? (
              <p className="mt-3 rounded-[12px] bg-[#F2F2F7] px-3 py-2 text-sm text-[#6E6E73]">
                <span className="font-semibold text-[#1D1D1F]">Resolution: </span>
                {row.resolution_details}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
