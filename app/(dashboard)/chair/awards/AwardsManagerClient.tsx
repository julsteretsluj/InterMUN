"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AWARD_CATEGORIES, awardCategoryMeta, isConferenceEventPlaceholderRow } from "@/lib/awards";
import {
  maxRubricPointsForAwardCategory,
  rubricBandInitialsForAssignment,
  rubricCriteriaForAwardAssignmentCategory,
  rubricNumericTotalForAssignment,
} from "@/lib/award-category-rubric";
import { saveAwardAssignment, deleteAwardAssignment } from "@/app/actions/awards";
import type { AwardAssignment } from "@/types/database";
import { Trash2, Plus, Award } from "lucide-react";
import { RubricCriterionPicker } from "@/app/(dashboard)/chair/awards/RubricCriterionPicker";

type Conf = { id: string; name: string; committee: string | null };
type Prof = { id: string; name: string | null };

/** Committee chamber only (DISEC, ECOSOC, …) — not the agenda/topic title. */
function committeeOptionLabel(c: Conf) {
  return c.committee?.trim() || c.id.slice(0, 8);
}

export function AwardsManagerClient({
  conferences,
  assignments: initialAssignments,
  profiles,
}: {
  conferences: Conf[];
  assignments: AwardAssignment[];
  profiles: Prof[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const committeeById = useMemo(
    () => Object.fromEntries(conferences.map((c) => [c.id, committeeOptionLabel(c)])),
    [conferences]
  );

  /** Include every assignment recipient so controlled selects always have a matching <option>. */
  const profileOptions = useMemo(() => {
    const byId = new Map(profiles.map((p) => [p.id, p] as const));
    for (const a of initialAssignments) {
      const id = a.recipient_profile_id;
      if (id && !byId.has(id)) {
        byId.set(id, { id, name: null });
      }
    }
    return [...byId.values()].sort((a, b) => {
      const an = (a.name?.trim() || "").toLocaleLowerCase();
      const bn = (b.name?.trim() || "").toLocaleLowerCase();
      if (an !== bn) return an.localeCompare(bn);
      return a.id.localeCompare(b.id);
    });
  }, [profiles, initialAssignments]);

  const profileById = useMemo(
    () => Object.fromEntries(profileOptions.map((p) => [p.id, p.name?.trim() || "—"])),
    [profileOptions]
  );

  const [form, setForm] = useState({
    id: "",
    category: AWARD_CATEGORIES[0].id,
    committee_conference_id: "",
    recipient_profile_id: "",
    recipient_committee_id: "",
    notes: "",
    sort_order: "0",
  });
  /** Tracks 1–8 scores for RubricCriterionPicker (same mechanism as chair nominations). */
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});

  const rubricCriteria = useMemo(
    () => rubricCriteriaForAwardAssignmentCategory(form.category),
    [form.category]
  );

  const handleRubricScore = useCallback((key: string, score: number | null) => {
    setRubricScores((prev) => {
      const next = { ...prev };
      if (score == null || score < 1 || score > 8) delete next[key];
      else next[key] = score;
      return next;
    });
  }, []);

  /** Drop event-title placeholder rows unless an existing assignment or the open form still references them. */
  const committeePickerConferences = useMemo(() => {
    const base = conferences.filter((c) => !isConferenceEventPlaceholderRow(c));
    const neededIds = new Set<string>();
    for (const a of initialAssignments) {
      if (a.committee_conference_id) neededIds.add(a.committee_conference_id);
      if (a.recipient_committee_id) neededIds.add(a.recipient_committee_id);
    }
    if (form.committee_conference_id) neededIds.add(form.committee_conference_id);
    if (form.recipient_committee_id) neededIds.add(form.recipient_committee_id);
    const extras = conferences.filter((c) => isConferenceEventPlaceholderRow(c) && neededIds.has(c.id));
    const merged = [...base, ...extras];
    merged.sort((a, b) => committeeOptionLabel(a).localeCompare(committeeOptionLabel(b)));
    return merged;
  }, [
    conferences,
    initialAssignments,
    form.committee_conference_id,
    form.recipient_committee_id,
  ]);

  const meta = awardCategoryMeta(form.category);

  function resetForm() {
    setForm({
      id: "",
      category: AWARD_CATEGORIES[0].id,
      committee_conference_id: "",
      recipient_profile_id: "",
      recipient_committee_id: "",
      notes: "",
      sort_order: "0",
    });
    setRubricScores({});
  }

  function editRow(a: AwardAssignment) {
    setForm({
      id: a.id,
      category: a.category,
      committee_conference_id: a.committee_conference_id ?? "",
      recipient_profile_id: a.recipient_profile_id ?? "",
      recipient_committee_id: a.recipient_committee_id ?? "",
      notes: a.notes ?? "",
      sort_order: String(a.sort_order ?? 0),
    });
    setRubricScores(
      a.rubric_scores && typeof a.rubric_scores === "object"
        ? { ...(a.rubric_scores as Record<string, number>) }
        : {}
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveAwardAssignment(fd);
      if (res.error) setErr(res.error);
      else {
        setMsg(form.id ? "Updated." : "Saved.");
        resetForm();
        await router.refresh();
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Remove this award row?")) return;
    startTransition(async () => {
      const res = await deleteAwardAssignment(id);
      if (res.error) setErr(res.error);
      else {
        setMsg("Removed.");
        await router.refresh();
      }
    });
  }

  const ordered = [...initialAssignments].sort((a, b) => {
    const ia = AWARD_CATEGORIES.findIndex((c) => c.id === a.category);
    const ib = AWARD_CATEGORIES.findIndex((c) => c.id === b.category);
    if (ia !== ib) return ia - ib;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });

  return (
    <div className="space-y-10">
      <div className="rounded-xl border border-brand-navy/10 bg-brand-cream/40 p-4 text-sm text-brand-muted">
        <p className="flex items-start gap-2">
          <Award className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" />
          <span>
            SMT award structure: <strong className="text-brand-navy">Overall</strong> and{" "}
            <strong className="text-brand-navy">Chair / collective</strong> awards use the same SEAMUN band rubric as
            the chair Score page (every criterion 1–8 before save).{" "}
            <strong className="text-brand-navy">Committee-level</strong> trophies here are recipient / approval only—scores
            live in chair nominations (first tab). Delegates see only rows where they are the recipient.
          </span>
        </p>
      </div>

      {msg && (
        <p className="text-sm text-brand-navy bg-brand-accent/10 border border-brand-accent/22 rounded-lg px-3 py-2">
          {msg}
        </p>
      )}
      {err && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {err}
        </p>
      )}

      <section>
        <h3 className="font-display text-lg font-semibold text-brand-navy mb-3">Add or edit entry</h3>
        <form onSubmit={submitForm} className="space-y-4 rounded-xl border border-brand-navy/10 p-4 md:p-5 bg-brand-paper">
          <input type="hidden" name="id" value={form.id} />
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-brand-muted text-xs uppercase">Award</span>
              <select
                name="category"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-black/30"
                value={form.category}
                onChange={(e) => {
                  const next = e.target.value;
                  setForm((f) => ({ ...f, category: next }));
                  setRubricScores({});
                }}
              >
                {AWARD_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            {meta?.scope === "committee" && (
              <label className="block text-sm">
                <span className="text-brand-muted text-xs uppercase">Committee session</span>
                <select
                  name="committee_conference_id"
                  required
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-black/30"
                  value={form.committee_conference_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, committee_conference_id: e.target.value }))
                  }
                >
                  <option value="">Select committee…</option>
                  {committeePickerConferences.map((c) => (
                    <option key={c.id} value={c.id}>
                      {committeeOptionLabel(c)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {meta && (
            <p className="text-xs text-brand-muted border-l-2 border-brand-accent/50 pl-3">
              {meta.description}
            </p>
          )}

          {rubricCriteria && rubricCriteria.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-brand-accent/28 bg-brand-cream/45 p-3 dark:border-brand-accent/35 dark:bg-black/25">
              <p className="text-xs leading-relaxed text-brand-muted">
                Individual criteria (Beginning → Exemplary, then low/high). Same mechanism as committee nomination
                scoring—required before save.
              </p>
              <div className="grid gap-3">
                {rubricCriteria.map((criterion) => (
                  <RubricCriterionPicker
                    key={`${form.id}-${form.category}-${criterion.key}`}
                    criterion={criterion}
                    initialScore={Number(rubricScores[criterion.key] ?? 0)}
                    onScoreChange={handleRubricScore}
                  />
                ))}
              </div>
              <p className="font-mono text-xs text-brand-navy dark:text-zinc-200">
                Rubric total: {rubricNumericTotalForAssignment(rubricScores, form.category)}/
                {maxRubricPointsForAwardCategory(form.category)}{" "}
                <span className="text-brand-muted" title="Band initials">
                  ({rubricBandInitialsForAssignment(rubricScores, form.category)})
                </span>
              </p>
            </div>
          ) : meta?.scope === "committee" ? (
            <p className="text-xs leading-relaxed text-brand-muted border-l-2 border-slate-300 pl-3 dark:border-zinc-600">
              Committee-scoped awards: record the recipient here for the public list only. Detailed rubric scores come
              from approved chair nominations (Award submissions tab)—no duplicate scoring on this row.
            </p>
          ) : null}

          {(meta?.scope === "conference_wide" ||
            meta?.scope === "collective_person" ||
            meta?.scope === "committee") && (
            <label className="block text-sm">
              <span className="text-brand-muted text-xs uppercase">Recipient (delegate / chair)</span>
              <select
                name="recipient_profile_id"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-black/30"
                value={form.recipient_profile_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recipient_profile_id: e.target.value }))
                }
              >
                <option value="">— Not set —</option>
                {profileOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p.name || "No name").trim()} ({p.id.slice(0, 8)}…)
                  </option>
                ))}
              </select>
            </label>
          )}

          {meta?.scope === "collective_committee" && (
            <label className="block text-sm">
              <span className="text-brand-muted text-xs uppercase">Winning committee</span>
              <select
                name="recipient_committee_id"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-black/30"
                value={form.recipient_committee_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recipient_committee_id: e.target.value }))
                }
              >
                <option value="">— Not set —</option>
                {committeePickerConferences.map((c) => (
                  <option key={c.id} value={c.id}>
                    {committeeOptionLabel(c)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {meta?.id === "committee_honourable_mention" ? (
            <label className="block text-sm">
              <span className="text-brand-muted text-xs uppercase">Slot (1 or 2)</span>
              <input
                type="number"
                name="sort_order"
                min={1}
                max={2}
                className="mt-1 w-28 px-3 py-2 rounded-lg border border-brand-navy/15"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              />
            </label>
          ) : (
            <input type="hidden" name="sort_order" value="0" />
          )}

          <label className="block text-sm">
            <span className="text-brand-muted text-xs uppercase">Notes (statement of confirmation, evidence)</span>
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-navy/15"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional internal notes for SMT review…"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-white font-medium disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {form.id ? "Update" : "Add"} award
            </button>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-brand-navy/20 text-sm"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h3 className="font-display text-lg font-semibold text-brand-navy mb-3">Current list</h3>
        <div className="overflow-x-auto rounded-xl border border-brand-navy/10">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-brand-navy/10 bg-brand-cream/80">
                <th className="px-3 py-2 font-semibold text-brand-navy">Award</th>
                <th className="px-3 py-2 font-semibold text-brand-navy">Committee</th>
                <th className="px-3 py-2 font-semibold text-brand-navy">Recipient</th>
                <th className="px-3 py-2 font-semibold text-brand-navy">Rubric</th>
                <th className="px-3 py-2 font-semibold text-brand-navy">Notes</th>
                <th className="px-3 py-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {ordered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-brand-muted">
                    No award rows yet.
                  </td>
                </tr>
              ) : (
                ordered.map((a) => {
                  const m = awardCategoryMeta(a.category);
                  const recip =
                    a.recipient_profile_id != null
                      ? profileById[a.recipient_profile_id] ?? a.recipient_profile_id.slice(0, 8)
                      : a.recipient_committee_id != null
                        ? committeeById[a.recipient_committee_id] ?? "—"
                        : "—";
                  const comm =
                    a.committee_conference_id != null
                      ? committeeById[a.committee_conference_id] ?? "—"
                      : "—";
                  return (
                    <tr key={a.id} className="border-b border-brand-navy/5">
                      <td className="px-3 py-2 align-top">
                        <span className="font-medium text-brand-navy">{m?.label ?? a.category}</span>
                        {a.sort_order > 0 && (
                          <span className="text-xs text-brand-muted ml-1">#{a.sort_order}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-brand-muted align-top">{comm}</td>
                      <td className="px-3 py-2 align-top">{recip}</td>
                      <td className="px-3 py-2 align-top font-mono text-[0.7rem] text-brand-navy dark:text-zinc-300">
                        {rubricCriteriaForAwardAssignmentCategory(a.category) ? (
                          <>
                            <span className="tabular-nums">
                              {rubricNumericTotalForAssignment(a.rubric_scores, a.category)}/
                              {maxRubricPointsForAwardCategory(a.category)}
                            </span>
                            <span
                              className="mt-0.5 block max-w-[140px] truncate text-brand-muted text-[0.65rem]"
                              title={rubricBandInitialsForAssignment(a.rubric_scores, a.category)}
                            >
                              {rubricBandInitialsForAssignment(a.rubric_scores, a.category)}
                            </span>
                          </>
                        ) : (
                          <span className="text-brand-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-brand-muted align-top max-w-xs truncate">
                        {a.notes || "—"}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => editRow(a)}
                            className="text-xs text-brand-accent hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(a.id)}
                            className="text-xs text-red-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
