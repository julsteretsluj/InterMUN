"use client";

import { useState } from "react";
import { Check, Flag, Forward, Star, X } from "lucide-react";
import type {
  DelegationNoteHoldReason,
  DelegationNoteModerationState,
} from "@/lib/note-moderation";

export type ModerationNoteState = {
  id: string;
  moderation_state?: DelegationNoteModerationState;
  hold_reason?: DelegationNoteHoldReason | null;
  moderation_note?: string | null;
  starred_by_me: boolean;
  forwarded_to_smt: boolean;
  forwarded_to_advisor_profile_id: string | null;
};

type Props = {
  note: ModerationNoteState;
  isChairLike: boolean;
  isStaffLike: boolean;
  advisor: { advisorProfileId: string; forwardLabel: string } | null;
  onStar: (noteId: string, starred: boolean) => void;
  onForwardSmt: (noteId: string) => void;
  onForwardAdvisor: (noteId: string, advisorProfileId: string) => void;
  onReport: (noteId: string) => void;
  onApprove?: (noteId: string) => void;
  onReject?: (noteId: string, reason?: string) => void;
  labels: {
    toolbarLabel: string;
    star: string;
    starred: string;
    forwardToSmt: string;
    forwarded: string;
    forwardedToAdvisor: string;
    report: string;
    approve?: string;
    reject?: string;
    rejectReasonPlaceholder?: string;
    pendingReview?: string;
    rejected?: string;
    holdReason?: string;
    holdReasons?: {
      profanity: string;
      concernFlag: string;
      reported: string;
      unknown: string;
    };
  };
};

function holdReasonLabel(
  reason: DelegationNoteHoldReason | null | undefined,
  labels: Props["labels"]
): string {
  if (!labels.holdReasons) return reason ?? "";
  if (reason === "profanity") return labels.holdReasons.profanity;
  if (reason === "concern_flag") return labels.holdReasons.concernFlag;
  if (reason === "reported") return labels.holdReasons.reported;
  return labels.holdReasons.unknown;
}

export function DelegationNoteModerationToolbar({
  note,
  isChairLike,
  isStaffLike,
  advisor,
  onStar,
  onForwardSmt,
  onForwardAdvisor,
  onReport,
  onApprove,
  onReject,
  labels,
}: Props) {
  const [rejectReason, setRejectReason] = useState("");
  const state = note.moderation_state ?? "approved";
  const showChairActions = isChairLike || isStaffLike;

  if (!showChairActions && state === "approved") return null;

  const statusBadge =
    state === "held" ? (
      <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-100">
        {labels.pendingReview ?? "Pending review"}
      </span>
    ) : state === "rejected" ? (
      <span className="inline-flex rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-900 dark:text-red-100">
        {labels.rejected ?? "Rejected"}
      </span>
    ) : null;

  return (
    <div
      className="mt-3 rounded-lg border border-brand-accent/25 bg-brand-accent/5 px-3 py-2.5"
      role="toolbar"
      aria-label={labels.toolbarLabel}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
          {labels.toolbarLabel}
        </p>
        {statusBadge}
      </div>
      {state === "held" && labels.holdReason ? (
        <p className="mb-2 text-[11px] text-brand-muted">
          {labels.holdReason.replace("{reason}", holdReasonLabel(note.hold_reason, labels))}
        </p>
      ) : null}
      {state === "rejected" && note.moderation_note?.trim() ? (
        <p className="mb-2 text-[11px] text-red-800 dark:text-red-200">{note.moderation_note}</p>
      ) : null}
      {state === "held" && isChairLike && onApprove && onReject ? (
        <div className="mb-3 space-y-2 rounded-lg border border-amber-300/30 bg-amber-50/50 p-2.5 dark:border-amber-500/25 dark:bg-amber-950/20">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onApprove(note.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/35 dark:bg-emerald-950/40 dark:text-emerald-100"
            >
              <Check className="size-3.5 shrink-0" aria-hidden />
              {labels.approve ?? "Approve"}
            </button>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={labels.rejectReasonPlaceholder ?? "Optional reject reason"}
              className="min-w-[10rem] flex-1 rounded-lg border border-brand-navy/15 bg-white/80 px-2.5 py-1.5 text-xs text-brand-navy"
            />
            <button
              type="button"
              onClick={() => onReject(note.id, rejectReason.trim() || undefined)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-100 dark:border-red-500/35 dark:bg-red-950/40 dark:text-red-100"
            >
              <X className="size-3.5 shrink-0" aria-hidden />
              {labels.reject ?? "Reject"}
            </button>
          </div>
        </div>
      ) : null}
      {showChairActions ? (
        <div className="flex flex-wrap gap-2">
          {isChairLike ? (
            <button
              type="button"
              onClick={() => onStar(note.id, !note.starred_by_me)}
              className={[
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                note.starred_by_me
                  ? "border-brand-accent bg-brand-accent/20 text-brand-navy"
                  : "border-brand-navy/15 bg-brand-paper/90 text-brand-navy hover:border-brand-accent/40",
              ].join(" ")}
              aria-pressed={note.starred_by_me}
            >
              <Star
                className="size-3.5 shrink-0"
                fill={note.starred_by_me ? "currentColor" : "none"}
                aria-hidden
              />
              {note.starred_by_me ? labels.starred : labels.star}
            </button>
          ) : null}

          {isStaffLike ? (
            <button
              type="button"
              onClick={() => onForwardSmt(note.id)}
              disabled={note.forwarded_to_smt}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-navy/15 bg-brand-paper/90 px-3 py-1.5 text-xs font-medium text-brand-navy hover:border-brand-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Forward className="size-3.5 shrink-0" aria-hidden />
              {note.forwarded_to_smt ? labels.forwarded : labels.forwardToSmt}
            </button>
          ) : null}

          {isStaffLike && advisor ? (
            <button
              type="button"
              onClick={() => onForwardAdvisor(note.id, advisor.advisorProfileId)}
              disabled={Boolean(note.forwarded_to_advisor_profile_id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-navy/15 bg-brand-paper/90 px-3 py-1.5 text-xs font-medium text-brand-navy hover:border-brand-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Forward className="size-3.5 shrink-0" aria-hidden />
              {note.forwarded_to_advisor_profile_id
                ? labels.forwardedToAdvisor
                : advisor.forwardLabel}
            </button>
          ) : null}

          {isChairLike && state === "approved" ? (
            <button
              type="button"
              onClick={() => onReport(note.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-50/80 px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-100/90 dark:border-red-500/35 dark:bg-red-950/40 dark:text-red-100"
            >
              <Flag className="size-3.5 shrink-0" aria-hidden />
              {labels.report}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
