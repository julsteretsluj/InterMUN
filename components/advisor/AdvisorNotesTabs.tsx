"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { QueryTabs } from "@/components/ui/Tabs";
import { AdvisorSendDelegateNoteForm } from "@/components/advisor/AdvisorSendDelegateNoteForm";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { groupAdvisorDelegatesByDifficultyAndCommittee } from "@/lib/advisor-delegate-grouping";
import { translateCommitteeLabel } from "@/lib/i18n/committee-topic-labels";
import { translateCommitteeTagDifficulty } from "@/lib/i18n/committee-display-tags";

export type AdvisorForwardedNote = {
  id: string;
  topic: string;
  content: string;
  createdAt: string;
  forwardedAt: string | null;
};

export type AdvisorSentNote = {
  id: string;
  topic: string;
  content: string;
  createdAt: string;
  moderationState: string;
  delegateLabel: string;
  delegateUserId: string | null;
};

export type AdvisorLinkedDelegate = {
  userId: string;
  label: string;
  country: string;
  committee: string | null;
};

function ForwardedNotesList({ notes }: { notes: AdvisorForwardedNote[] }) {
  const t = useTranslations("advisorDashboard.notes");

  if (notes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-brand-navy/15 px-4 py-6 text-center text-sm text-brand-muted">
        {t("empty")}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {notes.map((n) => (
        <li
          key={n.id}
          className="rounded-xl border border-brand-navy/10 bg-brand-paper px-4 py-3 dark:border-zinc-700"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{n.topic}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy dark:text-zinc-100">{n.content}</p>
          <p className="mt-2 font-mono text-[0.65rem] text-brand-muted">
            {new Date(n.createdAt).toLocaleString()}
            {n.forwardedAt ? ` · ${t("forwarded")} ${new Date(n.forwardedAt).toLocaleString()}` : null}
          </p>
        </li>
      ))}
    </ul>
  );
}

function SendNotesPanel({
  delegates,
  sentNotes,
}: {
  delegates: AdvisorLinkedDelegate[];
  sentNotes: AdvisorSentNote[];
}) {
  const t = useTranslations("advisorDashboard.notes");
  const ts = useTranslations("advisorDashboard.sendNote");
  const tCommitteeLabels = useTranslations("committeeNames.labels");
  const tCommitteeTags = useTranslations("committeeTags");
  const [selectedUserId, setSelectedUserId] = useState(() => delegates[0]?.userId ?? "");

  const delegateSections = useMemo(
    () =>
      groupAdvisorDelegatesByDifficultyAndCommittee(delegates, {
        getCommittee: (d) => d.committee,
        getSortLabel: (d) => d.label,
      }),
    [delegates]
  );

  const sortedDelegates = useMemo(
    () => delegateSections.flatMap((section) => section.committees.flatMap((group) => group.items)),
    [delegateSections]
  );

  const selectedDelegate = useMemo(
    () => sortedDelegates.find((d) => d.userId === selectedUserId) ?? sortedDelegates[0] ?? null,
    [sortedDelegates, selectedUserId]
  );

  if (delegates.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-brand-navy/15 px-4 py-6 text-center text-sm text-brand-muted">
        {t("noLinkedDelegates")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-brand-muted">{t("sendIntro")}</p>

      {delegates.length > 1 ? (
        <div>
          <label
            htmlFor="advisor-send-delegate"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-muted"
          >
            {t("pickDelegate")}
          </label>
          <select
            id="advisor-send-delegate"
            value={selectedDelegate?.userId ?? ""}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="mun-field w-full max-w-md"
          >
            {delegateSections.map((section) =>
              section.committees.map((group) => {
                const committeeLabel = translateCommitteeLabel(tCommitteeLabels, group.committee);
                const difficultyLabel = section.difficulty
                  ? translateCommitteeTagDifficulty(section.difficulty, tCommitteeTags)
                  : null;
                return (
                  <optgroup
                    key={`${section.difficulty ?? "other"}-${group.committee}`}
                    label={difficultyLabel ? `${committeeLabel} (${difficultyLabel})` : committeeLabel}
                  >
                    {group.items.map((d) => (
                      <option key={d.userId} value={d.userId}>
                        {flagEmojiForCountryName(d.country)} {d.label}
                      </option>
                    ))}
                  </optgroup>
                );
              })
            )}
          </select>
        </div>
      ) : null}

      {selectedDelegate ? (
        <AdvisorSendDelegateNoteForm
          key={selectedDelegate.userId}
          delegateUserId={selectedDelegate.userId}
          delegateLabel={selectedDelegate.label}
        />
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-brand-navy dark:text-zinc-100">{t("sentTitle")}</h2>
        {sentNotes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand-navy/15 px-4 py-6 text-center text-sm text-brand-muted">
            {t("sentEmpty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {sentNotes.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-brand-navy/10 bg-brand-paper px-4 py-3 dark:border-zinc-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    {t("toDelegate", { delegate: n.delegateLabel })}
                  </p>
                  {n.delegateUserId ? (
                    <Link
                      href={`/advisor/delegates/${encodeURIComponent(n.delegateUserId)}/notes`}
                      className="text-xs font-medium text-brand-accent hover:underline"
                    >
                      {t("openConversation")}
                    </Link>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-brand-muted">{n.topic}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy dark:text-zinc-100">{n.content}</p>
                <p className="mt-2 font-mono text-[0.65rem] text-brand-muted">
                  {new Date(n.createdAt).toLocaleString()}
                  {n.moderationState === "held" ? ` · ${ts("heldBadge")}` : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function AdvisorNotesTabs({
  forwardedNotes,
  sentNotes,
  linkedDelegates,
}: {
  forwardedNotes: AdvisorForwardedNote[];
  sentNotes: AdvisorSentNote[];
  linkedDelegates: AdvisorLinkedDelegate[];
}) {
  const t = useTranslations("advisorDashboard.notes");

  const tabOptions = useMemo(
    () => [
      { id: "forwarded", label: t("tabForwarded") },
      { id: "send", label: t("tabSend") },
    ],
    [t]
  );

  return (
    <QueryTabs
      tabKey="tab"
      fallbackId="forwarded"
      ariaLabel={t("tabsAriaLabel")}
      options={tabOptions}
      renderPanel={(activeTab) =>
        activeTab === "send" ? (
          <SendNotesPanel delegates={linkedDelegates} sentNotes={sentNotes} />
        ) : (
          <ForwardedNotesList notes={forwardedNotes} />
        )
      }
    />
  );
}
