"use client";

import { Flag, Forward, Star } from "lucide-react";

export type ModerationNoteState = {
  id: string;
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
  labels: {
    toolbarLabel: string;
    star: string;
    starred: string;
    forwardToSmt: string;
    forwarded: string;
    forwardedToAdvisor: string;
    report: string;
  };
};

export function DelegationNoteModerationToolbar({
  note,
  isChairLike,
  isStaffLike,
  advisor,
  onStar,
  onForwardSmt,
  onForwardAdvisor,
  onReport,
  labels,
}: Props) {
  if (!isChairLike && !isStaffLike) return null;

  return (
    <div
      className="mt-3 rounded-lg border border-brand-accent/25 bg-brand-accent/5 px-3 py-2.5"
      role="toolbar"
      aria-label={labels.toolbarLabel}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
        {labels.toolbarLabel}
      </p>
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

        {isChairLike ? (
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
    </div>
  );
}
