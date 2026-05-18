"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { detectInappropriateTerms } from "@/lib/note-moderation";
import { forwardDelegationNoteToAdvisorAction } from "@/app/actions/advisorStaff";
import type { DelegationNoteBundleItem, NoteTopic } from "@/lib/delegation-notes-bundle";

const TOPIC_MSG_KEY: Record<
  NoteTopic,
  "blocForming" | "speechPoisOrPocs" | "questions" | "informalConversations"
> = {
  "bloc forming": "blocForming",
  "speech pois or pocs": "speechPoisOrPocs",
  questions: "questions",
  "informal conversations": "informalConversations",
};

export type SmtNotesTabId =
  | "addressed"
  | "fromChairs"
  | "byDelegate"
  | "byAdvisor"
  | "allByCommittee";

type CommitteeOpt = { id: string; label: string };

type Props = {
  initialNotes: DelegationNoteBundleItem[];
  committees: CommitteeOpt[];
  myUserId: string;
  myAllocationIds: string[];
  advisorByAllocationId: Record<string, { advisorProfileId: string; name: string }>;
  advisorNameByProfileId: Record<string, string>;
};

function noteAddressedToUser(
  note: DelegationNoteBundleItem,
  userId: string,
  myAllocationIds: Set<string>
): boolean {
  return note.recipients.some((r) => {
    if (r.kind === "chair" && r.profileId === userId) return true;
    if (r.kind === "allocation" && myAllocationIds.has(r.allocationId)) return true;
    if (r.kind === "chair_all") return true;
    return false;
  });
}

function advisorForNote(
  note: DelegationNoteBundleItem,
  advisorByAllocationId: Record<string, { advisorProfileId: string; name: string }>
): { advisorProfileId: string; name: string } | null {
  if (note.sender.kind === "allocation") {
    const hit = advisorByAllocationId[note.sender.allocationId];
    if (hit) return hit;
  }
  for (const r of note.recipients) {
    if (r.kind === "allocation") {
      const hit = advisorByAllocationId[r.allocationId];
      if (hit) return hit;
    }
  }
  return null;
}

export function SmtNotesTabs({
  initialNotes,
  committees,
  myUserId,
  myAllocationIds,
  advisorByAllocationId,
  advisorNameByProfileId,
}: Props) {
  const t = useTranslations("smtNotesPage");
  const tDn = useTranslations("delegationNotes");
  const [tab, setTab] = useState<SmtNotesTabId>("addressed");
  const [committeeId, setCommitteeId] = useState<string>(committees[0]?.id ?? "all");
  const [notes, setNotes] = useState(initialNotes);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const myAllocSet = useMemo(() => new Set(myAllocationIds), [myAllocationIds]);
  const moderationById = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const n of notes) m.set(n.id, detectInappropriateTerms(n.content));
    return m;
  }, [notes]);

  const topicLabel = (topic: NoteTopic) => tDn(`topics.${TOPIC_MSG_KEY[topic]}`);

  const recipientSummary = (note: DelegationNoteBundleItem) => {
    if (note.recipients.length === 0) return tDn("toEmpty");
    return note.recipients
      .map((r) => {
        if (r.kind === "allocation") return r.country;
        if (r.kind === "chair") return r.name;
        return tDn("anyChair");
      })
      .join(", ");
  };

  const filteredNotes = useMemo(() => {
    let list = notes;

    if (tab === "addressed") {
      list = list.filter((n) => noteAddressedToUser(n, myUserId, myAllocSet));
    } else if (tab === "fromChairs") {
      list = list.filter((n) => n.forwarded_to_smt);
    } else if (tab === "byDelegate") {
      list = list.filter((n) => n.sender.kind === "allocation");
    } else if (tab === "byAdvisor") {
      list = list.filter((n) => Boolean(n.forwarded_to_advisor_profile_id));
    } else if (tab === "allByCommittee" && committeeId !== "all") {
      list = list.filter((n) => n.conference_id === committeeId);
    }

    return list;
  }, [notes, tab, myUserId, myAllocSet, committeeId]);

  const committeeLabelById = useMemo(
    () => new Map(committees.map((c) => [c.id, c.label] as const)),
    [committees]
  );

  async function forwardToAdvisor(noteId: string, advisorProfileId: string) {
    const res = await forwardDelegationNoteToAdvisorAction(noteId, advisorProfileId);
    if (res.error) {
      setError(res.error);
      return;
    }
    const nowIso = new Date().toISOString();
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? {
              ...n,
              forwarded_to_advisor_profile_id: advisorProfileId,
              forwarded_to_advisor_at: nowIso,
            }
          : n
      )
    );
  }

  const tabs: { id: SmtNotesTabId; label: string }[] = [
    { id: "addressed", label: t("tabs.addressed") },
    { id: "fromChairs", label: t("tabs.fromChairs") },
    { id: "byDelegate", label: t("tabs.byDelegate") },
    { id: "byAdvisor", label: t("tabs.byAdvisor") },
    { id: "allByCommittee", label: t("tabs.allByCommittee") },
  ];

  const tabBtn = (id: SmtNotesTabId, label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`shrink-0 snap-start rounded-t-lg px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
        tab === id
          ? "border-brand-accent text-brand-navy bg-brand-paper"
          : "border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-brand-muted">{t("intro")}</p>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1 border-b border-brand-navy/10" role="tablist" aria-label={t("tabsAria")}>
          {tabs.map(({ id, label }) => tabBtn(id, label))}
        </div>
      </div>

      {tab === "addressed" ? <p className="text-xs text-brand-muted">{t("tabHints.addressed")}</p> : null}
      {tab === "fromChairs" ? <p className="text-xs text-brand-muted">{t("tabHints.fromChairs")}</p> : null}
      {tab === "byDelegate" ? <p className="text-xs text-brand-muted">{t("tabHints.byDelegate")}</p> : null}
      {tab === "byAdvisor" ? <p className="text-xs text-brand-muted">{t("tabHints.byAdvisor")}</p> : null}
      {tab === "allByCommittee" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCommitteeId("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${
              committeeId === "all"
                ? "border-brand-accent bg-brand-accent/15 text-brand-navy"
                : "border-brand-navy/15 text-brand-muted hover:border-brand-navy/30"
            }`}
          >
            {t("allCommittees")}
          </button>
          {committees.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCommitteeId(c.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium border ${
                committeeId === c.id
                  ? "border-brand-accent bg-brand-accent/15 text-brand-navy"
                  : "border-brand-navy/15 text-brand-muted hover:border-brand-navy/30"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-100">
          {error}
        </p>
      ) : null}

      <div className="mun-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-brand-navy">{t("listTitle")}</h3>
          <p className="text-xs text-brand-muted">{tDn("noteCount", { count: filteredNotes.length })}</p>
        </div>

        {filteredNotes.length === 0 ? (
          <p className="text-sm text-brand-muted">{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {filteredNotes.map((n) => {
              const expanded = expandedId === n.id;
              const committeeLabel = committeeLabelById.get(n.conference_id) ?? t("unknownCommittee");
              const adv = advisorForNote(n, advisorByAllocationId);
              const advisorName = n.forwarded_to_advisor_profile_id
                ? advisorNameByProfileId[n.forwarded_to_advisor_profile_id] ?? tDn("advisorFallback")
                : null;

              return (
                <li key={n.id} className="mun-card-dense border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-brand-muted">
                        <span className="rounded-md bg-brand-navy/5 px-1.5 py-0.5 font-mono normal-case text-[0.65rem] text-brand-navy dark:bg-white/10">
                          {committeeLabel}
                        </span>
                        <span className="font-medium normal-case text-brand-navy">
                          {n.concern_flag ? "🚩" : "⚑"}{" "}
                          {n.sender.kind === "allocation" ? (
                            <>
                              {flagEmojiForCountryName(n.sender.country)} {n.sender.country}
                            </>
                          ) : (
                            <>🏳️ {n.sender.name}</>
                          )}
                        </span>
                        <span className="text-brand-muted/60">•</span>
                        <span className="text-brand-navy">{topicLabel(n.topic)}</span>
                        {n.forwarded_to_smt ? (
                          <span className="font-semibold text-brand-accent-bright">{tDn("forwardedBadge")}</span>
                        ) : null}
                        {n.forwarded_to_advisor_profile_id ? (
                          <span className="font-semibold text-brand-accent-bright">
                            {tDn("forwardedToAdvisorBadge")}
                            {advisorName ? ` · ${advisorName}` : ""}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-brand-navy">
                        {expanded || n.content.length <= 280 ? n.content : `${n.content.slice(0, 280)}…`}
                      </p>
                      {moderationById.get(n.id)?.length ? (
                        <p className="mt-2 rounded-md border border-amber-300/50 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-200">
                          {tDn("readerWarning")}
                        </p>
                      ) : null}
                      {n.content.length > 280 ? (
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : n.id)}
                          className="mt-1 text-xs font-medium text-brand-accent hover:underline"
                        >
                          {expanded ? tDn("close") : tDn("viewFullNote")}
                        </button>
                      ) : null}
                      <p className="mt-2 text-xs text-brand-muted">
                        {tDn("toLabel")} {recipientSummary(n)}
                      </p>
                      <p className="mt-1 font-mono text-[0.65rem] text-brand-muted">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      {adv && !n.forwarded_to_advisor_profile_id ? (
                        <button
                          type="button"
                          onClick={() => void forwardToAdvisor(n.id, adv.advisorProfileId)}
                          className="mun-btn px-2.5 py-1 text-xs"
                        >
                          {tDn("forwardToAdvisor", { name: adv.name })}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
