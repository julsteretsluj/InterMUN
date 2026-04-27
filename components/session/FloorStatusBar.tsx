"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock, Megaphone, PauseCircle } from "lucide-react";
import { DaisAnnouncementBody } from "@/components/dais/DaisAnnouncementBody";
import { firstVisibleDaisRow } from "@/lib/dais-visible";
import { parseRollAttendance, rollAttendanceShortLabel } from "@/lib/roll-attendance";
import { useConferenceTimer } from "@/lib/use-conference-timer";
import { useTranslations } from "next-intl";
import {
  committeeSessionEndTimestampMs,
  formatCountdownOrElapsed,
} from "@/lib/committee-session-end";

type Announcement = {
  id: string;
  body: string;
  created_at: string;
  body_format?: string | null;
  is_pinned?: boolean | null;
  publish_at?: string | null;
};
type PauseEventRow = { id: string; reason: string; created_at: string };
type ActiveMotionRow = {
  id: string;
  title: string | null;
  vote_type: string | null;
  required_majority: string | null;
  closed_at: string | null;
};

type FloorTheme = "dark" | "light";

function formatSessionElapsed(startIso: string, nowMs: number): string {
  const t0 = new Date(startIso).getTime();
  if (Number.isNaN(t0)) return "—";
  let sec = Math.max(0, Math.floor((nowMs - t0) / 1000));
  const h = Math.floor(sec / 3600);
  sec %= 3600;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${m}:${pad(s)}`;
}

export function FloorStatusBar({
  conferenceId,
  observeOnly = false,
  theme = "dark",
  activeMotionVoteItemId = null,
  sessionMiniControls = "full",
}: {
  conferenceId: string;
  observeOnly?: boolean;
  theme?: FloorTheme;
  /** When set, show current motion + floor timer above dais / speakers (e.g. delegate committee room). */
  activeMotionVoteItemId?: string | null;
  /** Session quick links: full for chairs/staff, minimal for compact chair panels, none for read-only/delegate views. */
  sessionMiniControls?: "full" | "minimal" | "none";
}) {
  const t = useTranslations("views.session.floorStatus");
  const tActiveMotion = useTranslations("views.session.activeMotion");
  const supabase = createClient();
  const { timer } = useConferenceTimer(conferenceId, activeMotionVoteItemId);
  const [latestDais, setLatestDais] = useState<Announcement | null>(null);
  const [pauseEvents, setPauseEvents] = useState<PauseEventRow[]>([]);
  const [activeMotions, setActiveMotions] = useState<ActiveMotionRow[]>([]);
  const [rollSelf, setRollSelf] = useState<string | null>(null);
  const [selfAllocationId, setSelfAllocationId] = useState<string | null>(null);
  const [expandedAnnouncement, setExpandedAnnouncement] = useState<Announcement | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState<number | null>(null);
  const [sessionEndsAt, setSessionEndsAt] = useState<string | null>(null);
  /** Bumps once per second while a session is running (or a limit is set) so timers update. */
  const [, setSessionTick] = useState(0);

  const loadProcedureSession = useCallback(() => {
    return supabase
      .from("procedure_states")
      .select("committee_session_started_at, committee_session_duration_seconds, committee_session_ends_at")
      .eq("conference_id", conferenceId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        const errorMessage = String(error?.message ?? "");
        const missingSessionColumns =
          /schema cache/i.test(errorMessage) &&
          /committee_session_started_at|committee_session_duration_seconds|committee_session_ends_at/i.test(
            errorMessage
          );
        if (missingSessionColumns) {
          setSessionStartedAt(null);
          setSessionDurationSeconds(null);
          setSessionEndsAt(null);
          return;
        }
        const row = data as {
          committee_session_started_at?: string | null;
          committee_session_duration_seconds?: number | null;
          committee_session_ends_at?: string | null;
        } | null;
        setSessionStartedAt(row?.committee_session_started_at ?? null);
        setSessionDurationSeconds(row?.committee_session_duration_seconds ?? null);
        setSessionEndsAt(row?.committee_session_ends_at ?? null);
      });
  }, [supabase, conferenceId]);

  const loadDais = useCallback(() => {
    return supabase
      .from("dais_announcements")
      .select("id, body, created_at, body_format, is_pinned, publish_at")
      .eq("conference_id", conferenceId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(24)
      .then(({ data }) => {
        const rows = (data as Announcement[]) ?? [];
        setLatestDais(firstVisibleDaisRow(rows));
      });
  }, [supabase, conferenceId]);

  const loadPauseEvents = useCallback(() => {
    return supabase
      .from("timer_pause_events")
      .select("id, reason, created_at")
      .eq("conference_id", conferenceId)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setPauseEvents((data as PauseEventRow[]) ?? []));
  }, [supabase, conferenceId]);

  const loadActiveMotions = useCallback(() => {
    return supabase
      .from("vote_items")
      .select("id, title, vote_type, required_majority, closed_at")
      .eq("conference_id", conferenceId)
      .is("closed_at", null)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setActiveMotions((data as ActiveMotionRow[]) ?? []));
  }, [supabase, conferenceId]);

  const loadSelfRollCall = useCallback(
    async (allocationId: string) => {
      const { data: rc } = await supabase
        .from("roll_call_entries")
        .select("present, attendance")
        .eq("conference_id", conferenceId)
        .eq("allocation_id", allocationId)
        .maybeSingle();
      if (rc) {
        const row = rc as { present?: boolean; attendance?: string | null };
        const att = parseRollAttendance(row.attendance) ?? (row.present === true ? "present_voting" : "absent");
        setRollSelf(rollAttendanceShortLabel(att));
        return;
      }
      setRollSelf(null);
    },
    [supabase, conferenceId]
  );

  useEffect(() => {
    void loadDais();
    void loadPauseEvents();
    void loadActiveMotions();

    if (!observeOnly) {
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: alloc } = await supabase
          .from("allocations")
          .select("id")
          .eq("conference_id", conferenceId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!alloc?.id) return;
        setSelfAllocationId(alloc.id);
        await loadSelfRollCall(alloc.id);
      })();
    }
  }, [supabase, conferenceId, loadDais, loadPauseEvents, loadActiveMotions, loadSelfRollCall, observeOnly]);

  useEffect(() => {
    void loadProcedureSession();
    const ch = supabase
      .channel(`floor-procedure-session-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "procedure_states",
          filter: `conference_id=eq.${conferenceId}`,
        },
        () => void loadProcedureSession()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, conferenceId, loadProcedureSession]);

  const sessionEndMs =
    sessionStartedAt != null
      ? committeeSessionEndTimestampMs(sessionStartedAt, sessionDurationSeconds, sessionEndsAt)
      : null;

  useEffect(() => {
    if (!sessionStartedAt) return;
    const id = window.setInterval(() => setSessionTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [sessionStartedAt]);

  useEffect(() => {
    const t = window.setInterval(() => {
      void loadDais();
      void loadPauseEvents();
    }, 25000);
    return () => window.clearInterval(t);
  }, [loadDais, loadPauseEvents]);

  useEffect(() => {
    const ch = supabase
      .channel(`floor-dais-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dais_announcements",
          filter: `conference_id=eq.${conferenceId}`,
        },
        () => void loadDais()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "timer_pause_events",
          filter: `conference_id=eq.${conferenceId}`,
        },
        () => void loadPauseEvents()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vote_items",
          filter: `conference_id=eq.${conferenceId}`,
        },
        () => void loadActiveMotions()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, conferenceId, loadDais, loadPauseEvents, loadActiveMotions]);

  useEffect(() => {
    if (observeOnly || !selfAllocationId) return;
    const ch = supabase
      .channel(`floor-roll-self-${conferenceId}-${selfAllocationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "roll_call_entries",
          filter: `conference_id=eq.${conferenceId}`,
        },
        (payload) => {
          const row = payload.new as { allocation_id?: string | null } | null;
          const oldRow = payload.old as { allocation_id?: string | null } | null;
          if (row?.allocation_id === selfAllocationId || oldRow?.allocation_id === selfAllocationId) {
            void loadSelfRollCall(selfAllocationId);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, conferenceId, selfAllocationId, loadSelfRollCall, observeOnly]);

  const isLight = theme === "light";
  const box = isLight
    ? "rounded-lg border border-brand-navy/10 bg-brand-cream/30 px-3 py-1.5 text-brand-navy text-sm space-y-1.5"
    : "rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-brand-navy text-sm space-y-1.5";
  const muted = isLight
    ? "text-[0.65rem] uppercase tracking-wider text-brand-muted"
    : "text-[0.65rem] uppercase tracking-wider text-brand-navy/80";
  const icon = isLight ? "text-brand-accent" : "text-brand-accent-bright";
  const border = isLight ? "border-brand-navy/10" : "border-white/10";
  const bodyText = isLight ? "text-brand-navy/95" : "text-brand-navy/95";
  const qText = "text-brand-navy/90";
  const card = isLight
    ? "rounded-lg border border-brand-navy/10 bg-white/80 px-2.5 py-1.5 text-brand-navy"
    : "rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-brand-navy";
  const cardActive = isLight
    ? "rounded-lg border border-brand-accent/40 bg-brand-accent/10 px-2.5 py-1.5 text-brand-navy"
    : "rounded-lg border border-brand-accent/40 bg-brand-accent/10 px-2.5 py-1.5 text-brand-navy";

  const limitNow = Date.now();
  const limitFmt =
    sessionStartedAt != null && sessionEndMs != null
      ? formatCountdownOrElapsed(sessionEndMs, limitNow)
      : null;
  const quickLinkLabel = useCallback(
    (key: "quickLinkSession" | "quickLinkRoll" | "quickLinkSpeakers" | "quickLinkMotions" | "quickLinkTimer") => {
      const value = t(key);
      if (value === `views.session.floorStatus.${key}`) {
        if (key === "quickLinkSession") return "Session";
        if (key === "quickLinkRoll") return "Roll";
        if (key === "quickLinkSpeakers") return "Speakers";
        if (key === "quickLinkMotions") return "Motions";
        return "Timer";
      }
      return value;
    },
    [t]
  );
  const sessionQuickLinks =
    sessionMiniControls === "minimal"
      ? [
          { href: "/chair/session", label: quickLinkLabel("quickLinkSession") },
          { href: "/chair/session/timer", label: quickLinkLabel("quickLinkTimer") },
        ]
      : [
          { href: "/chair/session", label: quickLinkLabel("quickLinkSession") },
          { href: "/chair/session/roll-call", label: quickLinkLabel("quickLinkRoll") },
          { href: "/chair/session/speakers", label: quickLinkLabel("quickLinkSpeakers") },
          { href: "/chair/session/motions", label: quickLinkLabel("quickLinkMotions") },
          { href: "/chair/session/timer", label: quickLinkLabel("quickLinkTimer") },
        ];

  const sessionElapsedRow = (
    <div
      className={
        isLight
          ? "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-brand-navy/10 bg-brand-cream/40 px-3 py-1.5 text-sm text-brand-navy"
          : "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-brand-navy"
      }
    >
      <Clock className={`h-4 w-4 shrink-0 ${icon}`} aria-hidden />
      <span className="font-display font-semibold tabular-nums tracking-tight" suppressHydrationWarning>
        {sessionStartedAt ? formatSessionElapsed(sessionStartedAt, limitNow) : t("sessionNotStarted")}
      </span>
      {sessionStartedAt && limitFmt ? (
        <>
          <span className={isLight ? "text-brand-navy/30" : "text-white/25"} aria-hidden>
            ·
          </span>
          <span
            className={`font-display font-semibold tabular-nums tracking-tight ${
              limitFmt.label === "passed"
                ? isLight
                  ? "text-amber-800"
                  : "text-amber-200"
                : undefined
            }`}
            suppressHydrationWarning
          >
            {limitFmt.label === "remaining"
              ? t("limitRemaining", { value: limitFmt.text })
              : t("limitOverBy", { value: limitFmt.text })}
          </span>
        </>
      ) : null}
      {timer?.current_speaker?.trim() ? (
        <>
          <span className={isLight ? "text-brand-navy/30" : "text-white/25"} aria-hidden>
            ·
          </span>
          <span className={isLight ? "text-brand-navy/75" : "text-brand-navy/80"}>
            {tActiveMotion("currentSpeaker")}:{" "}
            <span className="font-medium text-brand-navy">{timer.current_speaker.trim()}</span>
          </span>
        </>
      ) : null}
      {sessionMiniControls === "none" ? null : (
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {sessionQuickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                isLight
                  ? "rounded-full border border-brand-navy/15 bg-white/70 px-2 py-0.5 text-[0.7rem] font-medium text-brand-navy hover:bg-white"
                  : "rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[0.7rem] font-medium text-brand-navy hover:bg-white/15"
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-1.5">
      {sessionElapsedRow}
      {activeMotions.length > 0 ? (
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {activeMotions.map((motion) => {
            const isCurrent = activeMotionVoteItemId != null && motion.id === activeMotionVoteItemId;
            const title = motion.title?.trim() || tActiveMotion("motionFallback");
            return (
              <div key={motion.id} className={isCurrent ? cardActive : card}>
                <p className={`${muted} truncate`}>
                  {isCurrent ? tActiveMotion("currentMotion") : tActiveMotion("motionFallback")}
                </p>
                <p className="truncate text-xs font-semibold text-brand-navy">{title}</p>
                <p className="mt-0.5 text-[0.65rem] text-brand-navy/80">
                  {(motion.vote_type || "motion").replace(/_/g, " ")} ·{" "}
                  {motion.required_majority === "2/3" ? "2/3" : tActiveMotion("majoritySimple")}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className={box}>
      {latestDais && (
        <div className="flex gap-2 items-start">
          <Megaphone className={`w-4 h-4 ${icon} shrink-0 mt-0.5`} />
          <div>
            <span className={`${muted} block`}>
              {t("dais")}
              {latestDais.is_pinned ? (
                <span className="ml-2 normal-case text-amber-700 dark:text-amber-300">
                  · {t("pinned")}
                </span>
              ) : null}
            </span>
            <div className={bodyText}>
              <DaisAnnouncementBody
                body={latestDais.body}
                format={latestDais.body_format === "markdown" ? "markdown" : "plain"}
              />
              <button
                type="button"
                onClick={() => setExpandedAnnouncement(latestDais)}
                className="mt-0.5 text-xs font-medium text-brand-accent hover:underline"
              >
                {t("viewFullAnnouncement")}
              </button>
            </div>
          </div>
        </div>
      )}
      {pauseEvents.length > 0 ? (
        <div className={`flex gap-2 items-start pt-0.5 ${latestDais ? `border-t ${border}` : ""}`}>
          <PauseCircle className={`w-4 h-4 ${icon} shrink-0 mt-0.5`} aria-hidden />
          <div className="min-w-0 flex-1">
            <span className={`${muted} block`}>{t("timerPausesReadOnly")}</span>
            <ul className={`mt-0.5 space-y-0.5 text-xs ${qText}`}>
              {pauseEvents.map((ev) => (
                <li key={ev.id} className="flex flex-wrap gap-x-2 gap-y-0.5">
                  <time className="shrink-0 text-brand-muted" dateTime={ev.created_at}>
                    {new Date(ev.created_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  <span>{ev.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {rollSelf && (
        <p
          className={`text-[0.65rem] pt-0.5 border-t ${border} ${
            isLight ? "text-brand-muted" : "text-brand-navy/90"
          }`}
        >
          {t("rollCallYou")}:{" "}
          <span className={`font-medium ${isLight ? "text-brand-navy" : "text-brand-navy"}`}>{rollSelf}</span>
        </p>
      )}
      </div>
      {expandedAnnouncement ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("fullAnnouncement")}
          onClick={() => setExpandedAnnouncement(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-white/15 bg-brand-paper p-4 md:p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold text-brand-navy">{t("daisAnnouncement")}</h3>
              <button
                type="button"
                onClick={() => setExpandedAnnouncement(null)}
                className="text-xs font-medium text-brand-accent hover:underline"
              >
                {t("close")}
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto text-sm text-brand-navy">
              <DaisAnnouncementBody
                body={expandedAnnouncement.body}
                format={expandedAnnouncement.body_format === "markdown" ? "markdown" : "plain"}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
