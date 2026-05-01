"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CHAIR_MOTIONS_POINTS_PRESETS } from "@/lib/chair-motions-points-presets";
import { localizeCountryName } from "@/lib/i18n/localize-country-name";
import { createClient } from "@/lib/supabase/client";

type DelegateOption = {
  allocationId: string;
  label: string;
};
type ChairMotionsTab = "points" | "discipline";

type DelegateDisciplineRow = {
  allocationId: string;
  delegateLabel: string;
  warningCount: number;
  strikeCount: number;
  votingRightsLost: boolean;
  speakingRightsSuspended: boolean;
  removedFromCommittee: boolean;
  updatedAt: string;
};

export type DelegatePointEntry = {
  id: string;
  allocationId: string;
  delegateLabel: string;
  text: string;
  starred: boolean;
  createdAt: string;
};

export function ChairMotionsPointsLog({
  conferenceId,
  delegateOptions,
  showDiscipline = true,
}: {
  conferenceId: string;
  delegateOptions: DelegateOption[];
  showDiscipline?: boolean;
}) {
  const t = useTranslations("chairMotionsPointsLog");
  const tSessionControl = useTranslations("sessionControlClient");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<DelegatePointEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState("");
  const [draft, setDraft] = useState("");
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ChairMotionsTab>("points");
  const [disciplineRows, setDisciplineRows] = useState<DelegateDisciplineRow[]>([]);
  const [disciplineReason, setDisciplineReason] = useState("");

  const pointsPresets = useMemo(() => CHAIR_MOTIONS_POINTS_PRESETS.filter((p) => p.kind === "point"), []);

  const localizedCountryName = useCallback(
    (raw: string | null | undefined) => localizeCountryName(raw, locale) || tCommon("delegateFallbackName"),
    [locale, tCommon]
  );

  const presetText = useCallback(
    (presetId: string) => {
      switch (presetId) {
        case "moderated-caucus":
          return {
            buttonLabel: tSessionControl("presetModeratedCaucus"),
            logText: tSessionControl("presetModeratedCaucusTitle"),
          };
        case "unmoderated-caucus":
          return {
            buttonLabel: tSessionControl("presetUnmoderatedCaucus"),
            logText: tSessionControl("presetUnmoderatedCaucusTitle"),
          };
        case "open-speaker-list":
          return {
            buttonLabel: tSessionControl("presetOpenGsl"),
            logText: tSessionControl("presetOpenGsl"),
          };
        case "close-speaker-list":
          return {
            buttonLabel: tSessionControl("presetCloseDebate"),
            logText: tSessionControl("presetCloseDebate"),
          };
        case "point-of-order":
          return {
            buttonLabel: tSessionControl("pointOfOrder"),
            logText: tSessionControl("pointOfOrder"),
          };
        case "point-of-information":
          return {
            buttonLabel: tSessionControl("pointOfInformation"),
            logText: tSessionControl("pointOfInformation"),
          };
        case "point-of-personal-privilege":
          return {
            buttonLabel: tSessionControl("personalPrivilege"),
            logText: tSessionControl("personalPrivilege"),
          };
        default:
          return { buttonLabel: presetId, logText: presetId };
      }
    },
    [tSessionControl]
  );

  const loadPoints = useCallback(async () => {
    const { data, error } = await supabase
      .from("chair_delegate_points")
      .select("id, allocation_id, point_text, starred, created_at, allocations(country)")
      .eq("conference_id", conferenceId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      setReady(true);
      return;
    }
    type Row = {
      id: string;
      allocation_id: string;
      point_text: string;
      starred: boolean;
      created_at: string;
      allocations: { country: string | null } | { country: string | null }[] | null;
    };
    const rows = (data ?? []) as Row[];
    const mapped: DelegatePointEntry[] = rows.map((r) => {
      const alloc = Array.isArray(r.allocations) ? r.allocations[0] : r.allocations;
      const country = localizedCountryName(alloc?.country);
      return {
        id: r.id,
        allocationId: r.allocation_id,
        delegateLabel: country,
        text: r.point_text,
        starred: r.starred === true,
        createdAt: r.created_at,
      };
    });
    setEntries(mapped);
    setReady(true);
  }, [conferenceId, localizedCountryName, supabase]);

  const loadDiscipline = useCallback(async () => {
    const { data, error } = await supabase
      .from("chair_delegate_discipline")
      .select(
        "allocation_id, warning_count, strike_count, voting_rights_lost, speaking_rights_suspended, removed_from_committee, updated_at, allocations(country)"
      )
      .eq("conference_id", conferenceId)
      .order("updated_at", { ascending: false })
      .limit(400);
    if (error) return;
    type Row = {
      allocation_id: string;
      warning_count: number;
      strike_count: number;
      voting_rights_lost: boolean;
      speaking_rights_suspended: boolean;
      removed_from_committee: boolean;
      updated_at: string;
      allocations: { country: string | null } | { country: string | null }[] | null;
    };
    const rows = (data ?? []) as Row[];
    setDisciplineRows(
      rows.map((r) => {
        const alloc = Array.isArray(r.allocations) ? r.allocations[0] : r.allocations;
        return {
          allocationId: r.allocation_id,
          delegateLabel: localizedCountryName(alloc?.country),
          warningCount: r.warning_count ?? 0,
          strikeCount: r.strike_count ?? 0,
          votingRightsLost: r.voting_rights_lost === true,
          speakingRightsSuspended: r.speaking_rights_suspended === true,
          removedFromCommittee: r.removed_from_committee === true,
          updatedAt: r.updated_at,
        } satisfies DelegateDisciplineRow;
      })
    );
  }, [conferenceId, localizedCountryName, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPoints();
    if (showDiscipline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadDiscipline();
    }
  }, [loadDiscipline, loadPoints, showDiscipline]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setMyUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    const ch = supabase
      .channel(`chair-delegate-points-${conferenceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chair_delegate_points" },
        () => void loadPoints()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chair_delegate_discipline" },
        () => {
          if (showDiscipline) void loadDiscipline();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [conferenceId, loadDiscipline, loadPoints, showDiscipline, supabase]);

  const selectedDiscipline = useMemo(
    () => disciplineRows.find((r) => r.allocationId === selectedAllocationId) ?? null,
    [disciplineRows, selectedAllocationId]
  );

  const applyDisciplinaryAction = useCallback(
    async (action: "warning" | "strike" | "revoke_warning" | "revoke_strike" | "reset") => {
      if (!selectedAllocationId) return;
      const { error } = await supabase.rpc("apply_delegate_disciplinary_action", {
        p_conference_id: conferenceId,
        p_allocation_id: selectedAllocationId,
        p_action: action,
        p_reason: disciplineReason.trim() || null,
      });
      if (!error) {
        setDisciplineReason("");
        void loadDiscipline();
      }
    },
    [conferenceId, disciplineReason, loadDiscipline, selectedAllocationId, supabase]
  );

  const addEntry = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || !selectedAllocationId || !myUserId) return;
      const { error } = await supabase.from("chair_delegate_points").insert({
        conference_id: conferenceId,
        chair_user_id: myUserId,
        allocation_id: selectedAllocationId,
        point_text: t,
        starred: false,
      });
      if (!error) setDraft("");
    },
    [conferenceId, myUserId, selectedAllocationId, supabase]
  );

  const add = useCallback(() => {
    void addEntry(draft);
  }, [addEntry, draft]);

  const remove = useCallback(
    async (id: string) => {
      await supabase.from("chair_delegate_points").delete().eq("id", id);
    },
    [supabase]
  );

  const toggleStar = useCallback(
    async (entry: DelegatePointEntry) => {
      await supabase.from("chair_delegate_points").update({ starred: !entry.starred }).eq("id", entry.id);
    },
    [supabase]
  );

  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => Number(b.starred) - Number(a.starred) || b.createdAt.localeCompare(a.createdAt)
      ),
    [entries]
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-zinc-400">
        {t("intro")}
      </p>

      <div className="flex flex-wrap gap-2">
        {(
          showDiscipline
            ? ([["points", t("logTitle")], ["discipline", t("disciplinarySystem")]] as const)
            : ([["points", t("logTitle")]] as const)
        ).map(([id, label]) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-brand-accent/60 bg-brand-accent/20 text-brand-navy"
                  : "border-white/20 bg-black/25 text-brand-muted hover:bg-black/20 hover:text-brand-navy"
              }`}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          {t("delegate")}
          <select
            value={selectedAllocationId}
            onChange={(e) => setSelectedAllocationId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">{t("selectDelegate")}</option>
            {delegateOptions.map((d) => (
              <option key={d.allocationId} value={d.allocationId}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        {activeTab === "points" ? (
          <>
            <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              {t("text")}
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
                placeholder={t("textPlaceholder")}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={add}
                disabled={!draft.trim() || !selectedAllocationId || !myUserId}
                className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 dark:bg-brand-accent dark:hover:opacity-90"
              >
                {t("add")}
              </button>
            </div>

            <details className="mt-4 rounded-lg border border-slate-200/90 bg-slate-50/80 p-3 dark:border-zinc-600 dark:bg-zinc-800/40">
              <summary className="cursor-pointer text-sm font-medium text-slate-800 dark:text-zinc-200">
                {t("presetOptions")}
              </summary>
              <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
                {t("presetHint")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pointsPresets.map((p) => {
                  const preset = presetText(p.id);
                  return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => void addEntry(preset.logText)}
                    disabled={!selectedAllocationId || !myUserId}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-sm font-medium text-slate-800 hover:border-brand-accent/35 hover:bg-brand-accent/8 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-brand-accent/40 dark:hover:bg-brand-accent/12"
                  >
                    {preset.buttonLabel}
                  </button>
                  );
                })}
              </div>
            </details>
          </>
        ) : (
          <div className="mt-4 rounded-lg border border-rose-200/70 bg-rose-50/60 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
            <p className="text-sm font-medium text-rose-900 dark:text-rose-100">{t("disciplinarySystem")}</p>
            <p className="mt-1 text-xs text-rose-900/80 dark:text-rose-200/90">
              {t("disciplineRules")}
            </p>
            <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              {t("reasonOptional")}
              <input
                value={disciplineReason}
                onChange={(e) => setDisciplineReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void applyDisciplinaryAction("warning")}
                disabled={!selectedAllocationId}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {t("warning")}
              </button>
              <button
                type="button"
                onClick={() => void applyDisciplinaryAction("strike")}
                disabled={!selectedAllocationId}
                className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {t("strike")}
              </button>
              <button
                type="button"
                onClick={() => void applyDisciplinaryAction("revoke_warning")}
                disabled={!selectedAllocationId}
                className="rounded-lg border border-amber-600/50 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50 dark:bg-zinc-900 dark:text-amber-200"
              >
                {t("revokeWarning")}
              </button>
              <button
                type="button"
                onClick={() => void applyDisciplinaryAction("revoke_strike")}
                disabled={!selectedAllocationId}
                className="rounded-lg border border-rose-700/50 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 disabled:opacity-50 dark:bg-zinc-900 dark:text-rose-200"
              >
                {t("revokeStrike")}
              </button>
              <button
                type="button"
                onClick={() => void applyDisciplinaryAction("reset")}
                disabled={!selectedAllocationId}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
              >
                {t("resetRecord")}
              </button>
            </div>
            {selectedDiscipline ? (
              <div className="mt-3 rounded-md border border-rose-300/30 bg-white/75 px-3 py-2 text-xs text-slate-700 dark:border-rose-900/40 dark:bg-zinc-900/50 dark:text-zinc-200">
                <p>
                  <span className="font-semibold">{t("current")}:</span> {selectedDiscipline.delegateLabel} · {t("warnings")}{" "}
                  <span className="font-semibold">{selectedDiscipline.warningCount}</span> · {t("strikes")}{" "}
                  <span className="font-semibold">{selectedDiscipline.strikeCount}</span>
                </p>
                <p className="mt-1">
                  {t("votingDisabled")}:{" "}
                  <span className="font-semibold">
                    {selectedDiscipline.votingRightsLost ? t("yes") : t("no")}
                  </span>{" "}
                  · {t("speakingSuspended")}:{" "}
                  <span className="font-semibold">
                    {selectedDiscipline.speakingRightsSuspended ? t("yes") : t("no")}
                  </span>{" "}
                  · {t("removed")}:{" "}
                  <span className="font-semibold">
                    {selectedDiscipline.removedFromCommittee ? t("yes") : t("no")}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-zinc-50">📋 {t("log")}</h3>
        {!ready ? (
          <p className="mt-2 text-sm text-slate-500">{tCommon("loading")}</p>
        ) : sorted.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">{t("noEntries")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sorted.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/50"
              >
                <button
                  type="button"
                  onClick={() => void toggleStar(e)}
                  className="mt-0.5 shrink-0 text-amber-500 hover:text-amber-600 dark:text-amber-400"
                  aria-label={e.starred ? t("unstar") : t("star")}
                >
                  <Star className={`h-4 w-4 ${e.starred ? "fill-current" : ""}`} strokeWidth={1.75} />
                </button>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                    {t("point")} · {e.delegateLabel}
                  </span>
                  <p className="text-slate-900 dark:text-zinc-100">{e.text}</p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(e.id)}
                  className="shrink-0 text-xs font-medium text-red-700 hover:underline dark:text-red-400"
                >
                  {t("remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
