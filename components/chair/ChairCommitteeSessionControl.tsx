"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { isoToDatetimeLocalValue } from "@/lib/datetime-local";
import { HelpButton } from "@/components/HelpButton";
import { SessionHistoryPanel } from "@/components/session/SessionHistoryPanel";
import { committeeSessionEndTimestampMs, formatCountdownOrElapsed } from "@/lib/committee-session-end";

type EndMode = "none" | "duration" | "until";

type ProcedureRow = {
  state: string;
  current_vote_item_id: string | null;
  debate_closed: boolean;
  motion_floor_open: boolean;
  committee_session_started_at: string | null;
  committee_session_duration_seconds: number | null;
  committee_session_ends_at: string | null;
  committee_session_title: string | null;
};

function normalizeCommitteeSessionTitle(raw: string): string | null {
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

function clampDurationSeconds(hours: number, minutes: number): number {
  const h = Math.max(0, Math.floor(hours));
  const m = Math.max(0, Math.min(59, Math.floor(minutes)));
  const sec = h * 3600 + m * 60;
  return Math.max(60, sec);
}

function modeFromRow(durationSeconds: number | null, endsAt: string | null): EndMode {
  if (endsAt) return "until";
  if (durationSeconds != null && durationSeconds > 0) return "duration";
  return "none";
}

function formatSessionElapsed(startIso: string, nowMs: number): string {
  const t0 = new Date(startIso).getTime();
  if (Number.isNaN(t0)) return "--";
  let sec = Math.max(0, Math.floor((nowMs - t0) / 1000));
  const h = Math.floor(sec / 3600);
  sec %= 3600;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

export function ChairCommitteeSessionControl({
  conferenceId,
  initialStartedAt,
  initialDurationSeconds,
  initialEndsAt,
  initialSessionTitle,
}: {
  conferenceId: string;
  initialStartedAt: string | null;
  initialDurationSeconds: number | null;
  initialEndsAt: string | null;
  initialSessionTitle: string | null;
}) {
  const t = useTranslations("views.session.committeeControl");
  const supabase = useMemo(() => createClient(), []);
  const [startedAt, setStartedAt] = useState<string | null>(initialStartedAt);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState(() => initialSessionTitle ?? "");
  const [titleSaveStatus, setTitleSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const titleDebounceRef = useRef<number | null>(null);
  const sessionTitleDirtyRef = useRef(false);

  const [endMode, setEndMode] = useState<EndMode>(() =>
    modeFromRow(initialDurationSeconds, initialEndsAt)
  );
  const [durHours, setDurHours] = useState(3);
  const [durMinutes, setDurMinutes] = useState(0);
  const [endsAtLocal, setEndsAtLocal] = useState(() => isoToDatetimeLocalValue(initialEndsAt));
  const [supportsSessionStartColumn, setSupportsSessionStartColumn] = useState(true);
  const [supportsSessionEndOptions, setSupportsSessionEndOptions] = useState(true);
  const [, setTick] = useState(0);

  function isSessionColumnCacheError(message: string | null | undefined): boolean {
    const m = String(message ?? "");
    return (
      /schema cache/i.test(m) &&
      /committee_session_started_at|committee_session_duration_seconds|committee_session_ends_at|committee_session_title/i.test(
        m
      )
    );
  }

  function isSessionEndColumnCacheError(message: string | null | undefined): boolean {
    const m = String(message ?? "");
    return (
      /schema cache/i.test(m) &&
      /committee_session_duration_seconds|committee_session_ends_at/i.test(m)
    );
  }

  function friendlySessionColumnError(message: string | null | undefined): string | null {
    if (!isSessionColumnCacheError(message)) return null;
    return t("migrationUnavailable");
  }

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("procedure_states")
      .select(
        "committee_session_started_at, committee_session_duration_seconds, committee_session_ends_at, committee_session_title"
      )
      .eq("conference_id", conferenceId)
      .maybeSingle();
    const missingSessionColumns = isSessionColumnCacheError(error?.message);
    if (missingSessionColumns) {
      const message = String(error?.message ?? "");
      setSupportsSessionStartColumn(!/committee_session_started_at/i.test(message));
      setSupportsSessionEndOptions(!isSessionEndColumnCacheError(message));
      setStartedAt(null);
      return;
    }
    const missingEndColumns = isSessionEndColumnCacheError(error?.message);
    if (missingEndColumns) {
      setSupportsSessionEndOptions(false);
      const fallback = await supabase
        .from("procedure_states")
        .select("committee_session_started_at, committee_session_title")
        .eq("conference_id", conferenceId)
        .maybeSingle();
      const fb = fallback.data as {
        committee_session_started_at?: string | null;
        committee_session_title?: string | null;
      } | null;
      const s = fb?.committee_session_started_at ?? null;
      setStartedAt(s);
      if (!sessionTitleDirtyRef.current) {
        setSessionTitle(fb?.committee_session_title ?? "");
      }
      return;
    }
    if (!error) {
      setSupportsSessionEndOptions(true);
    }
    const row = data as {
      committee_session_started_at?: string | null;
      committee_session_duration_seconds?: number | null;
      committee_session_ends_at?: string | null;
      committee_session_title?: string | null;
    } | null;
    const s = row?.committee_session_started_at ?? null;
    const d = row?.committee_session_duration_seconds ?? null;
    const e = row?.committee_session_ends_at ?? null;
    setStartedAt(s);
    if (!sessionTitleDirtyRef.current) {
      setSessionTitle(row?.committee_session_title ?? "");
    }
    const m = modeFromRow(d, e);
    setEndMode(m);
    if (m === "duration" && d != null && d > 0) {
      setDurHours(Math.floor(d / 3600));
      setDurMinutes(Math.floor((d % 3600) / 60));
    }
    if (m === "until" && e) setEndsAtLocal(isoToDatetimeLocalValue(e));
  }, [supabase, conferenceId]);

  const persistSessionTitle = useCallback(
    async (raw: string) => {
      if (!supportsSessionStartColumn) return;
      setTitleSaveStatus("saving");
      const normalized = normalizeCommitteeSessionTitle(raw);
      const { error } = await supabase
        .from("procedure_states")
        .update({
          committee_session_title: normalized,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_id", conferenceId);
      if (error) {
        setTitleSaveStatus("idle");
        setMsg(friendlySessionColumnError(error.message) ?? error.message);
        return;
      }
      sessionTitleDirtyRef.current = false;
      setTitleSaveStatus("saved");
      window.setTimeout(() => {
        setTitleSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 2000);
    },
    [supabase, conferenceId, supportsSessionStartColumn]
  );

  function schedulePersistSessionTitle(raw: string) {
    if (titleDebounceRef.current) window.clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = window.setTimeout(() => {
      void persistSessionTitle(raw);
    }, 550);
  }

  function onSessionTitleChange(value: string) {
    sessionTitleDirtyRef.current = true;
    setSessionTitle(value);
    setTitleSaveStatus("idle");
    schedulePersistSessionTitle(value);
  }

  useEffect(() => {
    setStartedAt(initialStartedAt);
    const m = modeFromRow(initialDurationSeconds, initialEndsAt);
    setEndMode(m);
    if (m === "duration" && initialDurationSeconds != null && initialDurationSeconds > 0) {
      setDurHours(Math.floor(initialDurationSeconds / 3600));
      setDurMinutes(Math.floor((initialDurationSeconds % 3600) / 60));
    } else {
      setDurHours(3);
      setDurMinutes(0);
    }
    if (m === "until" && initialEndsAt) setEndsAtLocal(isoToDatetimeLocalValue(initialEndsAt));
    else setEndsAtLocal("");
  }, [initialStartedAt, initialDurationSeconds, initialEndsAt]);

  useEffect(() => {
    if (!sessionTitleDirtyRef.current) {
      setSessionTitle(initialSessionTitle ?? "");
    }
  }, [initialSessionTitle]);

  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) window.clearTimeout(titleDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel(`committee-session-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "procedure_states",
          filter: `conference_id=eq.${conferenceId}`,
        },
        () => void refresh()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, conferenceId, refresh]);

  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  function buildTimingPayload(): {
    committee_session_duration_seconds: number | null;
    committee_session_ends_at: string | null;
  } {
    if (endMode === "none") {
      return { committee_session_duration_seconds: null, committee_session_ends_at: null };
    }
    if (endMode === "duration") {
      return {
        committee_session_duration_seconds: clampDurationSeconds(durHours, durMinutes),
        committee_session_ends_at: null,
      };
    }
    const local = endsAtLocal.trim();
    if (!local) {
      return { committee_session_duration_seconds: null, committee_session_ends_at: null };
    }
    const iso = new Date(local).toISOString();
    return { committee_session_duration_seconds: null, committee_session_ends_at: iso };
  }

  async function loadFullRow(): Promise<ProcedureRow | null> {
    const withEndColumns = async () =>
      supabase
        .from("procedure_states")
        .select(
          "state, current_vote_item_id, debate_closed, motion_floor_open, committee_session_started_at, committee_session_duration_seconds, committee_session_ends_at, committee_session_title"
        )
        .eq("conference_id", conferenceId)
        .maybeSingle();
    const withoutEndColumns = async () =>
      supabase
        .from("procedure_states")
        .select(
          "state, current_vote_item_id, debate_closed, motion_floor_open, committee_session_started_at, committee_session_title"
        )
        .eq("conference_id", conferenceId)
        .maybeSingle();
    const withoutSessionColumns = async () =>
      supabase
        .from("procedure_states")
        .select("state, current_vote_item_id, debate_closed, motion_floor_open")
        .eq("conference_id", conferenceId)
        .maybeSingle();

    const { data, error } = supportsSessionStartColumn
      ? supportsSessionEndOptions
        ? await withEndColumns()
        : await withoutEndColumns()
      : await withoutSessionColumns();
    if (isSessionColumnCacheError(error?.message)) {
      const message = String(error?.message ?? "");
      setSupportsSessionStartColumn(!/committee_session_started_at/i.test(message));
      setSupportsSessionEndOptions(!isSessionEndColumnCacheError(message));
    }
    if (isSessionEndColumnCacheError(error?.message)) {
      setSupportsSessionEndOptions(false);
      const fallback = await withoutEndColumns();
      if (fallback.error || !fallback.data) return null;
      const base = fallback.data as Omit<ProcedureRow, "committee_session_duration_seconds" | "committee_session_ends_at">;
      return { ...base, committee_session_duration_seconds: null, committee_session_ends_at: null };
    }
    if (isSessionColumnCacheError(error?.message) && /committee_session_started_at/i.test(String(error?.message ?? ""))) {
      const fallback = await withoutSessionColumns();
      if (fallback.error || !fallback.data) return null;
      const base = fallback.data as Omit<
        ProcedureRow,
        "committee_session_started_at" | "committee_session_duration_seconds" | "committee_session_ends_at"
      >;
      return {
        ...base,
        committee_session_started_at: null,
        committee_session_duration_seconds: null,
        committee_session_ends_at: null,
        committee_session_title: null,
      };
    }
    if (error || !data) return null;
    return data as ProcedureRow;
  }

  function startSession() {
    setMsg(null);
    startTransition(async () => {
      const timing = buildTimingPayload();
      if (endMode === "until" && timing.committee_session_ends_at) {
        const endMs = new Date(timing.committee_session_ends_at).getTime();
        if (!Number.isNaN(endMs) && endMs <= Date.now()) {
          setMsg(t("endTimeInFuture"));
          return;
        }
      }
      if (!supportsSessionStartColumn) {
        setMsg(t("sessionStartUnavailable"));
        return;
      }
      const row = await loadFullRow();
      const now = new Date().toISOString();
      const titlePayload = normalizeCommitteeSessionTitle(sessionTitle);
      const timingUpdate = supportsSessionEndOptions
        ? {
            committee_session_duration_seconds: timing.committee_session_duration_seconds,
            committee_session_ends_at: timing.committee_session_ends_at,
          }
        : {};
      if (row) {
        const { error } = await supabase
          .from("procedure_states")
          .update({
            committee_session_started_at: now,
            committee_session_title: titlePayload,
            ...timingUpdate,
            updated_at: now,
          })
          .eq("conference_id", conferenceId);
        setMsg(
          error ? friendlySessionColumnError(error.message) ?? error.message : null
        );
      } else {
        const { error } = await supabase.from("procedure_states").insert({
          conference_id: conferenceId,
          state: "debate_open",
          debate_closed: false,
          motion_floor_open: false,
          committee_session_started_at: now,
          committee_session_title: titlePayload,
          ...timingUpdate,
          updated_at: now,
        });
        setMsg(
          error ? friendlySessionColumnError(error.message) ?? error.message : null
        );
      }
      void refresh();
    });
  }

  function stopSession() {
    setMsg(null);
    startTransition(async () => {
      if (!supportsSessionStartColumn) {
        setMsg(t("sessionStartUnavailable"));
        return;
      }
      if (titleDebounceRef.current) {
        window.clearTimeout(titleDebounceRef.current);
        titleDebounceRef.current = null;
      }
      sessionTitleDirtyRef.current = false;
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("procedure_states")
        .update({
          committee_session_started_at: null,
          committee_session_title: null,
          ...(supportsSessionEndOptions
            ? {
                committee_session_duration_seconds: null,
                committee_session_ends_at: null,
              }
            : {}),
          updated_at: now,
        })
        .eq("conference_id", conferenceId);
      setMsg(
        error ? friendlySessionColumnError(error.message) ?? error.message : null
      );
      void refresh();
    });
  }

  function saveScheduleWhileLive() {
    if (!startedAt) return;
    setMsg(null);
    startTransition(async () => {
      const timing = buildTimingPayload();
      if (endMode === "until" && timing.committee_session_ends_at) {
        const endMs = new Date(timing.committee_session_ends_at).getTime();
        if (!Number.isNaN(endMs) && endMs <= Date.now()) {
          setMsg(t("endTimeInFutureSetNoLimit"));
          return;
        }
      }
      const { error } = await supabase
        .from("procedure_states")
        .update({
          ...(supportsSessionEndOptions
            ? {
                committee_session_duration_seconds: timing.committee_session_duration_seconds,
                committee_session_ends_at: timing.committee_session_ends_at,
              }
            : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("conference_id", conferenceId);
      if (error) {
        setMsg(friendlySessionColumnError(error.message) ?? error.message);
      } else {
        setMsg(`ok:${t("sessionLimitUpdated")}`);
      }
      void refresh();
    });
  }

  const live = Boolean(startedAt);
  const nowMs = Date.now();
  const activeDurationSeconds = endMode === "duration" ? clampDurationSeconds(durHours, durMinutes) : null;
  const activeEndsAtIso = endMode === "until" ? (endsAtLocal.trim() ? new Date(endsAtLocal).toISOString() : null) : null;
  const endMs = live && startedAt
    ? committeeSessionEndTimestampMs(startedAt, activeDurationSeconds, activeEndsAtIso)
    : null;
  const elapsedText = live && startedAt ? formatSessionElapsed(startedAt, nowMs) : null;
  const countdown = endMs != null ? formatCountdownOrElapsed(endMs, nowMs) : null;

  const fieldWrap =
    "rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-brand-navy focus-within:border-brand-accent/40";
  const radioLabel = "flex cursor-pointer items-start gap-2 text-sm text-brand-navy";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/15 bg-black/25 p-6 shadow-sm backdrop-blur-sm md:p-8">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-brand-navy md:text-xl">{t("title")}</h3>
          <HelpButton title={t("title")}>
            {t("helpStartStop")}
          </HelpButton>
        </div>
        <p className="mt-1 text-sm text-brand-muted">{t("subtitle")}</p>

        <div className="mt-4 space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted" htmlFor="committee-session-title">
            {t("sessionNameLabel")}
          </label>
          <input
            id="committee-session-title"
            type="text"
            className="w-full max-w-md rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-brand-navy focus:border-brand-accent/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/25"
            value={sessionTitle}
            onChange={(e) => onSessionTitleChange(e.target.value)}
            placeholder={t("sessionNamePlaceholder")}
            disabled={pending || !supportsSessionStartColumn}
            maxLength={200}
            autoComplete="off"
          />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-muted">
            <span>{t("sessionNameHint")}</span>
            {titleSaveStatus === "saving" ? (
              <span className="text-brand-navy/90">{t("sessionNameSaving")}</span>
            ) : null}
            {titleSaveStatus === "saved" ? (
              <span className="text-brand-diplomatic dark:text-brand-accent-bright">{t("sessionNameSaved")}</span>
            ) : null}
          </div>
        </div>

        {live && startedAt ? (
          <div className="mt-4 space-y-1.5">
            <p className="text-sm font-medium text-brand-navy">
              {t("startedLabel")}{" "}
              <time dateTime={startedAt}>{new Date(startedAt).toLocaleString()}</time>
            </p>
            <p className="text-sm text-brand-navy">
              <span className="font-semibold">{t("timeInLabel")}</span>{" "}
              <span className="font-mono tabular-nums">{elapsedText ?? "--"}</span>
              {countdown ? (
                <>
                  <span className="mx-2 text-brand-muted/60">•</span>
                  <span className="font-semibold">{t("timeUntilEndLabel")}</span>{" "}
                  <span className="font-mono tabular-nums">
                    {countdown.label === "remaining"
                      ? countdown.text
                      : t("overByValue", { value: countdown.text })}
                  </span>
                </>
              ) : (
                <>
                  <span className="mx-2 text-brand-muted/60">•</span>
                  <span className="font-semibold">{t("modeLabel")}</span> {t("modeStopwatchNoLimit")}
                </>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-brand-muted">{t("sessionNotRunning")}</p>
        )}

        <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{t("sessionLimit")}</p>
            <HelpButton title={t("sessionLimitModesTitle")}>
              {t("sessionLimitModesHelp")}
            </HelpButton>
          </div>
          <p className="text-xs text-brand-muted">
            {t("sessionLimitOptional")} <strong className="font-medium text-brand-navy/90">{t("noneLabel")}</strong>{" "}
            {t("noneDescription")} <strong className="font-medium text-brand-navy/90">{t("timeBudgetLabel")}</strong>{" "}
            {t("timeBudgetDescription")} <strong className="font-medium text-brand-navy/90">{t("endTimeLabel")}</strong>{" "}
            {t("endTimeDescription")}
          </p>

          <label className={radioLabel}>
            <input
              type="radio"
              name="session-end"
              className="mt-1"
              checked={endMode === "none"}
              onChange={() => setEndMode("none")}
            />
            <span>
              <span className="font-medium">{t("noneIndefinite")}</span>
              <span className="block text-xs text-brand-muted">{t("noneScheduledEndHint")}</span>
            </span>
          </label>

          <label className={radioLabel}>
            <input
              type="radio"
              name="session-end"
              className="mt-1"
              checked={endMode === "duration"}
              onChange={() => setEndMode("duration")}
            />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{t("timeBudgetFromStart")}</span>
              {endMode === "duration" ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={fieldWrap}>
                    <label className="text-xs text-brand-muted">{t("hoursLabel")}</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      className="mt-0.5 w-20 bg-transparent text-brand-navy focus:outline-none"
                      value={durHours}
                      onChange={(e) => setDurHours(Number(e.target.value) || 0)}
                    />
                  </span>
                  <span className={fieldWrap}>
                    <label className="text-xs text-brand-muted">{t("minutesLabel")}</label>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      className="mt-0.5 w-20 bg-transparent text-brand-navy focus:outline-none"
                      value={durMinutes}
                      onChange={(e) => setDurMinutes(Number(e.target.value) || 0)}
                    />
                  </span>
                  <span className="text-xs text-brand-muted">{t("minimumOneMinute")}</span>
                </div>
              ) : null}
            </span>
          </label>

          <label className={radioLabel}>
            <input
              type="radio"
              name="session-end"
              className="mt-1"
              checked={endMode === "until"}
              onChange={() => setEndMode("until")}
            />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{t("endAtLocalTime")}</span>
              {endMode === "until" ? (
                <input
                  type="datetime-local"
                  className="mt-2 w-full max-w-xs rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-brand-navy focus:border-brand-accent/50 focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  value={endsAtLocal}
                  onChange={(e) => setEndsAtLocal(e.target.value)}
                />
              ) : null}
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {live ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={stopSession}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-400/60 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-500/20 disabled:opacity-50 dark:border-rose-400/50 dark:bg-rose-500/15 dark:text-rose-100 dark:hover:bg-rose-500/25"
              >
                <span aria-hidden>⏹️</span>
                {t("stopSession")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={saveScheduleWhileLive}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-brand-navy hover:bg-white/15 disabled:opacity-50"
              >
                {t("saveLimit")}
              </button>
              <HelpButton title={t("saveLimit")}>
                {t("saveLimitHelp")}
              </HelpButton>
            </>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={startSession}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-accent px-5 py-3 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              <span aria-hidden>▶️</span>
              {t("startSession")}
            </button>
          )}
        </div>

        {msg ? (
          <p
            className={`mt-3 text-sm ${
              msg.startsWith("ok:") ? "text-brand-diplomatic dark:text-brand-accent-bright" : "text-rose-300"
            }`}
          >
            {msg.startsWith("ok:") ? msg.slice(3) : msg}
          </p>
        ) : null}
      </div>

      <p className="text-sm text-brand-muted">
        {t("sidebarUsePrefix")} <span className="font-medium text-brand-navy/90">{t("rollCall")}</span>,{" "}
        <span className="font-medium text-brand-navy/90">{t("speakers")}</span>,{" "}
        <span className="font-medium text-brand-navy/90">{t("formalMotions")}</span>,{" "}
        <span className="font-medium text-brand-navy/90">{t("timer")}</span>, {t("sidebarAnd")}{" "}
        <span className="font-medium text-brand-navy/90">{t("announcements")}</span> {t("sidebarUseSuffix")}
      </p>

      <SessionHistoryPanel conferenceId={conferenceId} />
    </div>
  );
}
