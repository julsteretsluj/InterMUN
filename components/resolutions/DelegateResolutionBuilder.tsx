"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  PREAMBULATORY_OPENING_PRESETS,
  OPERATIVE_OPENING_PRESETS,
  combineClauseSuggestion,
  type ClauseSection,
} from "@/lib/resolution-clause-presets";

export type ResolutionPick = {
  id: string;
  conference_id: string;
  google_docs_url: string | null;
};

type SuggestionRow = {
  id: string;
  resolution_id: string;
  created_by: string;
  section: ClauseSection;
  opening_phrase: string | null;
  clause_body: string;
  created_at: string;
};

export function DelegateResolutionBuilder({ resolutions }: { resolutions: ResolutionPick[] }) {
  const t = useTranslations("delegateResolutionBuilder");
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedResolutionId, setSelectedResolutionId] = useState<string>(
    resolutions[0]?.id ?? ""
  );
  const [section, setSection] = useState<ClauseSection>("preambulatory");
  const [opening, setOpening] = useState("");
  const [body, setBody] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const selectedResolution = useMemo(
    () => resolutions.find((r) => r.id === selectedResolutionId) ?? null,
    [resolutions, selectedResolutionId]
  );

  const presets = section === "preambulatory" ? PREAMBULATORY_OPENING_PRESETS : OPERATIVE_OPENING_PRESETS;

  const preview = useMemo(() => combineClauseSuggestion(opening, body), [opening, body]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, [supabase]);

  const loadSuggestions = useCallback(async () => {
    if (!selectedResolutionId) {
      setSuggestions([]);
      return;
    }
    setLoadingList(true);
    setMsg(null);
    const { data, error } = await supabase
      .from("resolution_clause_suggestions")
      .select("id, resolution_id, created_by, section, opening_phrase, clause_body, created_at")
      .eq("resolution_id", selectedResolutionId)
      .order("created_at", { ascending: false })
      .limit(40);
    setLoadingList(false);
    if (error) {
      setMsg({ kind: "err", text: error.message });
      return;
    }
    setSuggestions((data ?? []) as SuggestionRow[]);
  }, [supabase, selectedResolutionId]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    if (resolutions.length && !resolutions.some((r) => r.id === selectedResolutionId)) {
      setSelectedResolutionId(resolutions[0]!.id);
    }
  }, [resolutions, selectedResolutionId]);

  async function submitSuggestion() {
    setMsg(null);
    const b = body.trim();
    if (!selectedResolution || !userId) {
      setMsg({ kind: "err", text: t("errSelectResolution") });
      return;
    }
    if (!b) {
      setMsg({ kind: "err", text: t("errEmptyBody") });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("resolution_clause_suggestions").insert({
      conference_id: selectedResolution.conference_id,
      resolution_id: selectedResolution.id,
      created_by: userId,
      section,
      opening_phrase: opening.trim() || null,
      clause_body: b,
    });
    setSubmitting(false);
    if (error) {
      setMsg({ kind: "err", text: error.message });
      return;
    }
    setMsg({ kind: "ok", text: t("okSubmitted") });
    setBody("");
    await loadSuggestions();
    router.refresh();
  }

  async function removeSuggestion(id: string) {
    setMsg(null);
    const { error } = await supabase.from("resolution_clause_suggestions").delete().eq("id", id);
    if (error) {
      setMsg({ kind: "err", text: error.message });
      return;
    }
    await loadSuggestions();
    router.refresh();
  }

  if (resolutions.length === 0) {
    return (
      <section className="mun-card space-y-2 border-white/10">
        <h2 className="font-display text-lg font-semibold text-brand-navy dark:text-zinc-100">
          {t("title")}
        </h2>
        <p className="text-sm text-brand-muted">{t("emptyDescription")}</p>
      </section>
    );
  }

  return (
    <section className="mun-card space-y-4 border-white/10">
      <div>
        <h2 className="font-display text-lg font-semibold text-brand-navy dark:text-zinc-100">
          {t("title")}
        </h2>
        <p className="mt-1 text-xs text-brand-muted leading-relaxed">{t("introDescription")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="mun-label normal-case">{t("draftResolution")}</span>
          <select
            className="mun-field"
            value={selectedResolutionId}
            onChange={(e) => setSelectedResolutionId(e.target.value)}
          >
            {resolutions.map((r, i) => (
              <option key={r.id} value={r.id}>
                {t("draftResolutionNumber", { number: i + 1 })}
                {r.google_docs_url ? t("googleDocLinkedTag") : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="mun-label normal-case">{t("section")}</span>
          <select
            className="mun-field"
            value={section}
            onChange={(e) => setSection(e.target.value as ClauseSection)}
          >
            <option value="preambulatory">{t("sectionPreambulatory")}</option>
            <option value="operative">{t("sectionOperative")}</option>
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <span className="mun-label normal-case block">{t("openingPresets")}</span>
        <div className="max-h-32 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2 dark:bg-white/5">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setOpening(p)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  opening === p
                    ? "border-brand-accent bg-brand-accent/15 text-brand-navy dark:text-zinc-100"
                    : "border-white/15 text-brand-muted hover:border-brand-accent/40"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-brand-muted">{t("openingPhraseLabel")}</span>
          <input
            className="mun-field"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            placeholder={
              section === "preambulatory"
                ? t("openingPlaceholderPreambulatory")
                : t("openingPlaceholderOperative")
            }
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="mun-label normal-case">Clause text</span>
        <textarea
          className="mun-field min-h-[100px] resize-y"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="…the rest of the clause (facts, actions, specifics). Commas after the opening are added when you save."
        />
      </label>

      <div className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">{t("preview")}</p>
        <p className="mt-1 text-sm text-brand-navy dark:text-zinc-200">{preview || t("previewDash")}</p>
      </div>

      {msg ? (
        <p
          className={
            msg.kind === "ok"
              ? "text-sm text-brand-diplomatic"
              : "text-sm text-red-700 dark:text-red-300"
          }
          role={msg.kind === "err" ? "alert" : undefined}
        >
          {msg.text}
        </p>
      ) : null}

      <button
        type="button"
        disabled={submitting}
        onClick={() => void submitSuggestion()}
        className="mun-btn-primary disabled:opacity-50"
      >
        {submitting ? t("submitting") : t("submitClause")}
      </button>

      <div className="border-t border-white/10 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy dark:text-zinc-100">
            {t("suggestionsHeading")}
          </h3>
          <button
            type="button"
            onClick={() => void loadSuggestions()}
            className="text-xs text-brand-diplomatic hover:underline"
            disabled={loadingList}
          >
            {t("refresh")}
          </button>
        </div>
        {loadingList ? (
          <p className="mt-2 text-xs text-brand-muted">{t("loading")}</p>
        ) : suggestions.length === 0 ? (
          <p className="mt-2 text-xs text-brand-muted">{t("noSuggestionsYet")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {suggestions.map((s) => {
              const full = combineClauseSuggestion(s.opening_phrase, s.clause_body);
              const mine = userId && s.created_by === userId;
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-sm dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-brand-muted">
                    <span
                      className={
                        s.section === "preambulatory"
                          ? "rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-900 dark:text-amber-200"
                          : "rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-900 dark:text-emerald-200"
                      }
                    >
                      {s.section === "preambulatory" ? t("badgePreamb") : t("badgeOperative")}
                    </span>
                    <span>{new Date(s.created_at).toLocaleString()}</span>
                    {mine ? (
                      <span className="rounded bg-brand-accent/20 px-1.5 py-0.5 text-brand-navy dark:text-zinc-200">
                        {t("badgeYours")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-brand-navy dark:text-zinc-200">{full}</p>
                  {mine ? (
                    <button
                      type="button"
                      onClick={() => void removeSuggestion(s.id)}
                      className="mt-2 text-xs text-red-700 hover:underline dark:text-red-300"
                    >
                      {t("delete")}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
