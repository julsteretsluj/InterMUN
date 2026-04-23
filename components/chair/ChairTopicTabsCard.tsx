"use client";

import { useState, useTransition } from "react";
import { setActiveDebateTopicAction } from "@/app/actions/activeDebateTopic";
import { useTranslations } from "next-intl";
import { translateAgendaTopicLabel } from "@/lib/i18n/committee-topic-labels";

export function ChairTopicTabsCard({
  topics,
  activeTopicId,
}: {
  topics: { id: string; label: string }[];
  activeTopicId: string;
}) {
  const t = useTranslations("chairTopicTabs");
  const tTopics = useTranslations("agendaTopics");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (topics.length <= 1) return null;

  return (
    <section className="rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        {t("selectLiveTopic")}
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-zinc-300">
        {t("chooseTopicHelp")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {topics.map((topic) => {
          const active = topic.id === activeTopicId;
          return (
            <button
              key={topic.id}
              type="button"
              disabled={pending || active}
              onClick={() => {
                startTransition(async () => {
                  const result = await setActiveDebateTopicAction(topic.id);
                  setMsg(result.error ?? null);
                });
              }}
              className={[
                "rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-60",
                active
                  ? "border-brand-accent/60 bg-brand-accent/12 text-slate-900 font-semibold dark:text-zinc-50"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
              ].join(" ")}
              aria-pressed={active}
            >
              {translateAgendaTopicLabel(tTopics, topic.label)}
            </button>
          );
        })}
      </div>
      {msg ? (
        <p className="mt-3 rounded-md border border-red-300/60 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
