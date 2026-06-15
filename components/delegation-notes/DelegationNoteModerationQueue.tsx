"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moderateDelegationNoteAction } from "@/app/actions/delegationNoteModeration";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import type { DelegationNoteHoldReason } from "@/lib/note-moderation";
import { useTranslations } from "next-intl";

export type HeldDelegationNote = {
  id: string;
  topic: string;
  content: string;
  concern_flag: boolean;
  hold_reason: DelegationNoteHoldReason | null;
  created_at: string;
  senderLabel: string;
  senderIsAllocation: boolean;
  recipientSummary: string;
};

function holdReasonKey(
  reason: DelegationNoteHoldReason | null
): "profanity" | "concernFlag" | "reported" | "unknown" {
  if (reason === "profanity") return "profanity";
  if (reason === "concern_flag") return "concernFlag";
  if (reason === "reported") return "reported";
  return "unknown";
}

export function DelegationNoteModerationQueue({ notes }: { notes: HeldDelegationNote[] }) {
  const t = useTranslations("delegationNotes.moderation");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...notes].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [notes]
  );

  function moderate(noteId: string, action: "approve" | "reject") {
    setActiveId(noteId);
    setMessage(null);
    startTransition(async () => {
      const res = await moderateDelegationNoteAction({
        noteId,
        action,
        note: action === "reject" ? rejectReasonById[noteId] : undefined,
      });
      setActiveId(null);
      if (res.error) {
        setMessage(res.error);
        return;
      }
      setMessage(action === "approve" ? t("approvedSuccess") : t("rejectedSuccess"));
      router.refresh();
    });
  }

  if (sorted.length === 0) {
    return (
      <section className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
        <p className="text-sm text-brand-muted">{t("emptyQueue")}</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-lg border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-xs text-brand-navy">
          {message}
        </p>
      ) : null}
      {sorted.map((note) => {
        const busy = pending && activeId === note.id;
        return (
          <article
            key={note.id}
            className="rounded-xl border border-amber-300/35 bg-amber-50/35 p-4 dark:border-amber-500/30 dark:bg-amber-950/20"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-100">
                  {t("pendingBadge")}
                </p>
                <p className="mt-1 text-xs text-brand-muted">
                  {t("holdReason", { reason: t(`holdReasons.${holdReasonKey(note.hold_reason)}`) })}
                </p>
              </div>
              <time className="text-xs text-brand-muted" dateTime={note.created_at}>
                {new Date(note.created_at).toLocaleString()}
              </time>
            </div>
            <p className="mt-3 text-sm text-brand-navy">
              <span className="font-medium">{t("fromLabel")} </span>
              {note.senderIsAllocation ? (
                <>
                  {flagEmojiForCountryName(note.senderLabel)} {note.senderLabel}
                </>
              ) : (
                note.senderLabel
              )}
            </p>
            <p className="mt-1 text-sm text-brand-muted">
              <span className="font-medium text-brand-navy/90">{t("toLabel")} </span>
              {note.recipientSummary}
            </p>
            <p className="mt-1 text-xs text-brand-muted">{note.topic}</p>
            <div className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-brand-navy/10 bg-white/70 px-3 py-2 text-sm text-brand-navy dark:bg-zinc-900/50">
              {note.content}
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => moderate(note.id, "approve")}
                className="mun-btn-primary px-4 py-2 text-sm disabled:opacity-50"
              >
                {busy ? t("working") : t("approve")}
              </button>
              <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
                <input
                  type="text"
                  value={rejectReasonById[note.id] ?? ""}
                  onChange={(e) =>
                    setRejectReasonById((prev) => ({ ...prev, [note.id]: e.target.value }))
                  }
                  placeholder={t("rejectReasonPlaceholder")}
                  className="w-full rounded-lg border border-brand-navy/15 bg-white/80 px-3 py-2 text-sm text-brand-navy"
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => moderate(note.id, "reject")}
                className="rounded-lg border border-red-400/40 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50 dark:border-red-500/35 dark:bg-red-950/40 dark:text-red-100"
              >
                {t("reject")}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
