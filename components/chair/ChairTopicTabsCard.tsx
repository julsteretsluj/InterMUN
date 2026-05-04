"use client";

import { useState, useTransition } from "react";
import { setActiveDebateTopicAction } from "@/app/actions/activeDebateTopic";
import { useLocale, useTranslations } from "next-intl";
import {
  translateAgendaTopicLabel,
  translateCommitteeLabel,
} from "@/lib/i18n/committee-topic-labels";

export function ChairTopicTabsCard({
  topics,
  activeTopicId,
  committeeLabelRaw,
}: {
  topics: { id: string; label: string }[];
  activeTopicId: string;
  committeeLabelRaw?: string | null;
}) {
  const locale = useLocale();
  const t = useTranslations("chairTopicTabs");
  const tTopics = useTranslations("agendaTopics");
  const tCommitteeLabels = useTranslations("committeeNames.labels");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (topics.length <= 1) return null;

  const committeeTrim = committeeLabelRaw?.trim() ?? "";

  return (
    <section className="rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      {committeeTrim ? (
        <div className="border-b border-slate-200/80 pb-3 dark:border-zinc-600/80">
          <p className="text-lg font-semibold leading-snug text-slate-900 dark:text-zinc-50">
            {translateCommitteeLabel(tCommitteeLabels, committeeTrim)}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-300">{t("chooseTopicHelp")}</p>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            {t("selectLiveTopic")}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-300">{t("chooseTopicHelp")}</p>
        </>
      )}
      <ul className="mt-3 divide-y divide-slate-200/80 rounded-lg border border-slate-200/90 dark:divide-zinc-600/80 dark:border-zinc-600/80">
        {topics.map((topic) => {
          const active = topic.id === activeTopicId;
          return (
            <li key={topic.id}>
              <button
                type="button"
                disabled={pending || active}
                onClick={() => {
                  startTransition(async () => {
                    const result = await setActiveDebateTopicAction(topic.id);
                    setMsg(result.error ?? null);
                  });
                }}
                className={[
                  "w-full px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-60",
                  active
                    ? "bg-brand-accent/12 font-semibold text-slate-900 dark:text-zinc-50"
                    : "text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800/80",
                ].join(" ")}
                aria-pressed={active}
              >
                {translateAgendaTopicLabel(tTopics, topic.label, locale)}
              </button>
            </li>
          );
        })}
      </ul>
      {msg ? (
        <p className="mt-3 rounded-md border border-red-300/60 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
