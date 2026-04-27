"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
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
import { useTranslations } from "next-intl";

type Conf = { id: string; name: string; committee: string | null };
type Prof = { id: string; name: string | null };

/** Committee chamber only (DISEC, ECOSOC, …) — not the agenda/topic title. */
function committeeOptionLabel(c: Conf) {
  return c.committee?.trim() || c.id.slice(0, 8);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function AwardsManagerClient({
  conferences,
  assignments: initialAssignments,
  profiles,
  enableCertificatePrint = false,
}: {
  conferences: Conf[];
  assignments: AwardAssignment[];
  profiles: Prof[];
  /** When true (SMT final awards tab): add certificate checkboxes and print selected. */
  enableCertificatePrint?: boolean;
}) {
  const t = useTranslations("awardsManager");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [certSelected, setCertSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const ids = new Set(initialAssignments.map((a) => a.id));
    setCertSelected((prev) => new Set([...prev].filter((id) => ids.has(id))));
  }, [initialAssignments]);

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
        setMsg(form.id ? t("updated") : t("saved"));
        resetForm();
        await router.refresh();
      }
    });
  }

  function remove(id: string) {
    if (!confirm(t("removeConfirm"))) return;
    startTransition(async () => {
      const res = await deleteAwardAssignment(id);
      if (res.error) setErr(res.error);
      else {
        setMsg(t("removed"));
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

  function toggleCert(id: string, checked: boolean) {
    setCertSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectAllCerts() {
    setCertSelected(new Set(ordered.map((a) => a.id)));
  }

  function clearCertSelection() {
    setCertSelected(new Set());
  }

  function printCertificates() {
    const rows = ordered.filter((a) => certSelected.has(a.id));
    if (rows.length === 0) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const bodyRows = rows
      .map((a) => {
        const m = awardCategoryMeta(a.category);
        const recip =
          a.recipient_profile_id != null
            ? profileById[a.recipient_profile_id] ?? a.recipient_profile_id.slice(0, 8)
            : a.recipient_committee_id != null
              ? committeeById[a.recipient_committee_id] ?? t("dash")
              : t("dash");
        const comm =
          a.committee_conference_id != null
            ? committeeById[a.committee_conference_id] ?? t("dash")
            : t("dash");
        return `<tr><td>${escapeHtml(m?.label ?? a.category)}</td><td>${escapeHtml(comm)}</td><td>${escapeHtml(
          String(recip)
        )}</td><td>${escapeHtml(a.notes?.trim() || t("dash"))}</td></tr>`;
      })
      .join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(t("certificateListTitle"))}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#111}
h1{font-size:1.25rem;margin-bottom:16px}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{border:1px solid #ccc;padding:8px;text-align:left}
th{background:#f4f4f5}
</style></head><body><h1>${escapeHtml(
      t("awardCertificatesSelectedRecipients")
    )}</h1><table><thead><tr><th>${escapeHtml(t("award"))}</th><th>${escapeHtml(
      t("committee")
    )}</th><th>${escapeHtml(t("recipient"))}</th><th>${escapeHtml(
      t("notes")
    )}</th></tr></thead><tbody>${bodyRows}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }

  return (
    <div className="space-y-10">
      <div className="rounded-xl border border-brand-navy/10 bg-brand-cream/40 p-4 text-sm text-brand-muted">
        <p className="flex items-start gap-2">
          <Award className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" />
          <span>
            {t("smtAwardStructurePrefix")} <strong className="text-brand-navy">{t("overall")}</strong>{" "}
            {t("smtAwardStructureMiddle")}{" "}
            <strong className="text-brand-navy">{t("chairCollective")}</strong> {t("smtAwardStructureMiddle2")}{" "}
            <strong className="text-brand-navy">{t("committeeLevel")}</strong> {t("smtAwardStructureSuffix")}
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
        <h3 className="font-display text-lg font-semibold text-brand-navy mb-3">{t("addOrEditEntry")}</h3>
        <form onSubmit={submitForm} className="space-y-4 rounded-xl border border-brand-navy/10 p-4 md:p-5 bg-brand-paper">
          <input type="hidden" name="id" value={form.id} />
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-brand-muted text-xs uppercase">{t("award")}</span>
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
                <span className="text-brand-muted text-xs uppercase">{t("committeeSession")}</span>
                <select
                  name="committee_conference_id"
                  required
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-black/30"
                  value={form.committee_conference_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, committee_conference_id: e.target.value }))
                  }
                >
                  <option value="">{t("selectCommittee")}</option>
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
                {t("individualCriteriaHelp")}
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
                {t("rubricTotal")}: {rubricNumericTotalForAssignment(rubricScores, form.category)}/
                {maxRubricPointsForAwardCategory(form.category)}{" "}
                <span className="text-brand-muted" title={t("bandInitials")}>
                  ({rubricBandInitialsForAssignment(rubricScores, form.category)})
                </span>
              </p>
            </div>
          ) : meta?.scope === "committee" ? (
            <p className="text-xs leading-relaxed text-brand-muted border-l-2 border-slate-300 pl-3 dark:border-zinc-600">
              {t("committeeScopedAwardsHelp")}
            </p>
          ) : null}

          {(meta?.scope === "conference_wide" ||
            meta?.scope === "collective_person" ||
            meta?.scope === "committee") && (
            <label className="block text-sm">
              <span className="text-brand-muted text-xs uppercase">{t("recipientDelegateChair")}</span>
              <select
                name="recipient_profile_id"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-black/30"
                value={form.recipient_profile_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recipient_profile_id: e.target.value }))
                }
              >
                <option value="">{t("notSet")}</option>
                {profileOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p.name || t("noName")).trim()} ({p.id.slice(0, 8)}…)
                  </option>
                ))}
              </select>
            </label>
          )}

          {meta?.scope === "collective_committee" && (
            <label className="block text-sm">
              <span className="text-brand-muted text-xs uppercase">{t("winningCommittee")}</span>
              <select
                name="recipient_committee_id"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-black/30"
                value={form.recipient_committee_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recipient_committee_id: e.target.value }))
                }
              >
                <option value="">{t("notSet")}</option>
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
              <span className="text-brand-muted text-xs uppercase">{t("slotOneOrTwo")}</span>
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
            <span className="text-brand-muted text-xs uppercase">{t("notesConfirmationEvidence")}</span>
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-navy/15"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t("optionalInternalNotes")}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-white font-medium disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {form.id ? t("update") : t("add")} {t("awardLower")}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-brand-navy/20 text-sm"
              >
                {t("cancelEdit")}
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h3 className="font-display text-lg font-semibold text-brand-navy mb-3">{t("currentList")}</h3>
        {enableCertificatePrint && ordered.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand-navy/10 bg-brand-cream/40 px-3 py-2 text-sm">
            <span className="text-brand-muted">{t("certificatePrinting")}</span>
            <button
              type="button"
              onClick={selectAllCerts}
              className="rounded-md border border-brand-navy/20 px-2 py-1 text-xs font-medium text-brand-navy hover:bg-brand-paper"
            >
              {t("selectAll")}
            </button>
            <button
              type="button"
              onClick={clearCertSelection}
              className="rounded-md border border-brand-navy/20 px-2 py-1 text-xs font-medium text-brand-navy hover:bg-brand-paper"
            >
              {t("clear")}
            </button>
            <button
              type="button"
              onClick={printCertificates}
              disabled={certSelected.size === 0}
              className="rounded-md bg-brand-accent px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
            >
              {t("printSelected")}
            </button>
            <span className="text-xs text-brand-muted">{t("selectedCount", { count: certSelected.size })}</span>
          </div>
        ) : null}
        <div className="overflow-x-auto rounded-xl border border-brand-navy/10">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-brand-navy/10 bg-brand-cream/80">
                {enableCertificatePrint ? (
                  <th className="px-2 py-2 w-10 font-semibold text-brand-navy text-center" scope="col">
                    <span className="sr-only">{t("certificate")}</span>
                  </th>
                ) : null}
                <th className="px-3 py-2 font-semibold text-brand-navy">{t("award")}</th>
                <th className="px-3 py-2 font-semibold text-brand-navy">{t("committee")}</th>
                <th className="px-3 py-2 font-semibold text-brand-navy">{t("recipient")}</th>
                <th className="px-3 py-2 font-semibold text-brand-navy">{t("rubric")}</th>
                <th className="px-3 py-2 font-semibold text-brand-navy">{t("notes")}</th>
                <th className="px-3 py-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {ordered.length === 0 ? (
                <tr>
                  <td colSpan={enableCertificatePrint ? 7 : 6} className="px-3 py-8 text-center text-brand-muted">
                    {t("noAwardRowsYet")}
                  </td>
                </tr>
              ) : (
                ordered.map((a) => {
                  const m = awardCategoryMeta(a.category);
                  const recip =
                    a.recipient_profile_id != null
                      ? profileById[a.recipient_profile_id] ?? a.recipient_profile_id.slice(0, 8)
                      : a.recipient_committee_id != null
                        ? committeeById[a.recipient_committee_id] ?? t("dash")
                        : t("dash");
                  const comm =
                    a.committee_conference_id != null
                      ? committeeById[a.committee_conference_id] ?? t("dash")
                      : t("dash");
                  return (
                    <tr key={a.id} className="border-b border-brand-navy/5">
                      {enableCertificatePrint ? (
                        <td className="px-2 py-2 align-top text-center">
                          <input
                            type="checkbox"
                            checked={certSelected.has(a.id)}
                            onChange={(e) => toggleCert(a.id, e.target.checked)}
                            aria-label={t("includeInCertificatePrint", { label: m?.label ?? a.category })}
                            className="h-4 w-4 rounded border-brand-navy/30"
                          />
                        </td>
                      ) : null}
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
                          <span className="text-brand-muted">{t("dash")}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-brand-muted align-top max-w-xs truncate">
                        {a.notes || t("dash")}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => editRow(a)}
                            className="text-xs text-brand-accent hover:underline"
                          >
                            {t("edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(a.id)}
                            className="text-xs text-red-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                            {t("remove")}
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
