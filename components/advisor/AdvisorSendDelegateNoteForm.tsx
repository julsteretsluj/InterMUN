"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  sendAdvisorDelegateNoteAction,
  type AdvisorNoteFormState,
} from "@/app/actions/advisorNotes";
import type { NoteTopic } from "@/lib/delegation-notes-bundle";

const TOPIC_OPTIONS: { value: NoteTopic; labelKey: string }[] = [
  { value: "questions", labelKey: "questions" },
  { value: "bloc forming", labelKey: "blocForming" },
  { value: "speech pois or pocs", labelKey: "speechPoisOrPocs" },
  { value: "informal conversations", labelKey: "informalConversations" },
];

const initialState: AdvisorNoteFormState = {};

export function AdvisorSendDelegateNoteForm({
  delegateUserId,
  delegateLabel,
}: {
  delegateUserId: string;
  delegateLabel: string;
}) {
  const t = useTranslations("advisorDashboard.sendNote");
  const [state, formAction, pending] = useActionState(sendAdvisorDelegateNoteAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-brand-navy/10 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
      <div>
        <h2 className="font-semibold text-brand-navy dark:text-zinc-100">{t("title", { delegate: delegateLabel })}</h2>
        <p className="mt-1 text-sm text-brand-muted">{t("hint")}</p>
      </div>
      <input type="hidden" name="delegateUserId" value={delegateUserId} />
      <div>
        <label htmlFor="advisor-note-topic" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-muted">
          {t("topicLabel")}
        </label>
        <select
          id="advisor-note-topic"
          name="topic"
          defaultValue="questions"
          className="mun-field w-full"
          disabled={pending}
        >
          {TOPIC_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(`topics.${opt.labelKey}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="advisor-note-content" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-muted">
          {t("messageLabel")}
        </label>
        <textarea
          id="advisor-note-content"
          name="content"
          rows={5}
          required
          disabled={pending}
          placeholder={t("placeholder")}
          className="mun-field w-full resize-y"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-brand-diplomatic dark:text-brand-accent-bright" role="status">
          {state.success}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="mun-btn-primary disabled:opacity-50">
        {pending ? t("sending") : t("send")}
      </button>
    </form>
  );
}
