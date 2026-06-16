"use client";

import { useTranslations } from "next-intl";

type NoteItem = {
  id: string;
  topic: string;
  content: string;
  createdAt: string;
  fromAdvisor: boolean;
  moderationState: string;
};

export function AdvisorDelegateNotesList({
  notes,
  delegateLabel,
}: {
  notes: NoteItem[];
  delegateLabel: string;
}) {
  const t = useTranslations("advisorDashboard.sendNote");

  if (notes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-brand-navy/15 px-4 py-6 text-center text-sm text-brand-muted">
        {t("emptyConversation", { delegate: delegateLabel })}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-brand-navy dark:text-zinc-100">{t("conversationTitle")}</h2>
      <ul className="space-y-3">
        {notes.map((note) => (
          <li
            key={note.id}
            className="rounded-xl border border-brand-navy/10 bg-brand-paper px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/80"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                {note.fromAdvisor ? t("fromYou") : t("fromDelegate", { delegate: delegateLabel })}
              </p>
              <time className="font-mono text-[0.65rem] text-brand-muted">
                {new Date(note.createdAt).toLocaleString()}
              </time>
            </div>
            {note.moderationState === "held" ? (
              <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{t("heldBadge")}</p>
            ) : null}
            <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy dark:text-zinc-100">{note.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
