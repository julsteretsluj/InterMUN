"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  smtAddAllocationRow,
  smtDeleteAllocationRow,
  smtImportAllocationsCsv,
  smtUpdateAllocationRow,
} from "@/app/actions/smtAllocations";
import { generateMissingAllocationCodes } from "@/app/actions/allocationCodes";
import type { AllocationCsvRow } from "@/lib/parse-allocation-csv";
import { parseAllocationCsv } from "@/lib/parse-allocation-csv";

export type MatrixRow = {
  id: string;
  country: string;
  user_id: string | null;
  linked_role: string | null;
  linked_name: string | null;
  code: string | null;
};

export type MatrixOverallRow = {
  id: string;
  conference_id: string;
  committee: string;
  topic: string;
  country: string;
  user_id: string | null;
  linked_role: string | null;
  linked_name: string | null;
  code: string | null;
};

export function AllocationMatrixManagerClient({
  conferences,
  selectedConferenceId,
  overallRows,
  rows,
}: {
  conferences: { id: string; name: string; committee: string | null }[];
  selectedConferenceId: string | null;
  overallRows: MatrixOverallRow[];
  rows: MatrixRow[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<{ n: number; sample: AllocationCsvRow[] } | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace_unassigned">("append");
  const [csvText, setCsvText] = useState("");

  function flash(ok: string | null, err: string | null) {
    setMessage(ok);
    setError(err);
  }

  function onConferenceChange(id: string) {
    router.push(`/smt/allocation-matrix?conference=${encodeURIComponent(id)}`);
  }

  function signupHref(conferenceId: string, allocationId: string) {
    return `/allocation-signup?conference=${encodeURIComponent(conferenceId)}&allocation=${encodeURIComponent(allocationId)}&next=${encodeURIComponent("/profile")}`;
  }

  function linkedLabel(row: { user_id: string | null; linked_role: string | null; linked_name: string | null }) {
    if (!row.user_id) return "Open";
    const role = row.linked_role?.trim().toLowerCase();
    const roleLabel = role === "chair" ? "Chair" : role === "delegate" ? "Delegate" : "Linked";
    const name = row.linked_name?.trim();
    return name ? `${roleLabel}: ${name}` : roleLabel;
  }

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedConferenceId) return;
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await smtAddAllocationRow(fd);
      if ("error" in res && res.error) {
        flash(null, res.error);
        return;
      }
      flash("Added row.", null);
      router.refresh();
      e.currentTarget.reset();
    });
  }

  function onQuickAddChairSeat(label: "Head Chair" | "Co-chair") {
    if (!selectedConferenceId) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("conference_id", selectedConferenceId);
      fd.set("country", label);
      fd.set("code", "");
      const res = await smtAddAllocationRow(fd);
      if ("error" in res && res.error) {
        flash(null, res.error);
        return;
      }
      flash(`Added ${label} seat.`, null);
      router.refresh();
    });
  }

  async function onUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await smtUpdateAllocationRow(fd);
      if ("error" in res && res.error) {
        flash(null, res.error);
        return;
      }
      flash("Updated row.", null);
      router.refresh();
    });
  }

  async function onDelete(allocationId: string) {
    if (!confirm("Remove this unassigned seat from the matrix?")) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await smtDeleteAllocationRow(allocationId);
      if ("error" in res && res.error) {
        flash(null, res.error);
        return;
      }
      flash("Deleted row.", null);
      router.refresh();
    });
  }

  async function onImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedConferenceId) return;
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await smtImportAllocationsCsv(fd);
      if ("error" in res && res.error) {
        flash(null, res.error);
        return;
      }
      const parts = [`Imported ${res.inserted} row(s).`];
      if (res.skippedDup) parts.push(`Skipped ${res.skippedDup} duplicate(s) already on the roster.`);
      if (res.replaceMode) parts.push("Replaced all unassigned seats.");
      flash(parts.join(" "), null);
      setCsvPreview(null);
      setCsvText("");
      router.refresh();
    });
  }

  async function onGenerateCodes() {
    if (!selectedConferenceId) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await generateMissingAllocationCodes(selectedConferenceId);
      if ("error" in res && res.error) {
        flash(null, res.error);
        return;
      }
      const n = "generated" in res ? res.generated : 0;
      flash(`Generated ${n} random code(s) for rows without one.`, null);
      router.refresh();
    });
  }

  function readFile(f: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsvText(text);
      try {
        const parsed = parseAllocationCsv(text);
        setCsvPreview({ n: parsed.length, sample: parsed.slice(0, 5) });
      } catch {
        setCsvPreview(null);
      }
    };
    reader.readAsText(f, "UTF-8");
  }

  if (!selectedConferenceId || conferences.length === 0) {
    return (
      <p className="text-sm text-brand-muted">
        Add committees to this event first in{" "}
        <Link href="/smt/conference" className="text-brand-gold font-medium hover:underline">
          Event & committee sessions
        </Link>
        .
      </p>
    );
  }

  const confLabel = conferences.find((c) => c.id === selectedConferenceId);
  const heading = confLabel
    ? [confLabel.name, confLabel.committee].filter(Boolean).join(" — ")
    : "Committee";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-navy">
          Overall allocation matrix (all committees)
        </h2>
        <p className="text-xs text-brand-muted">
          {overallRows.length} seat{overallRows.length === 1 ? "" : "s"} across{" "}
          {conferences.length} session{conferences.length === 1 ? "" : "s"}.
        </p>
        <div className="overflow-x-auto rounded-lg border border-brand-navy/10 max-h-[26rem]">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
                <th className="px-3 py-2">Committee</th>
                <th className="px-3 py-2">Topic</th>
                <th className="px-3 py-2">Country / position</th>
                <th className="px-3 py-2">Placard code</th>
                <th className="px-3 py-2">Assigned account</th>
                <th className="px-3 py-2">Sign-up link</th>
              </tr>
            </thead>
            <tbody>
              {overallRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-brand-muted">
                    No allocation rows found for the active event.
                  </td>
                </tr>
              ) : (
                overallRows.map((r) => (
                  <tr key={r.id} className="border-t border-brand-navy/5">
                    <td className="px-3 py-2 font-medium text-brand-navy">{r.committee}</td>
                    <td className="px-3 py-2 text-brand-navy/85">{r.topic}</td>
                    <td className="px-3 py-2">{r.country}</td>
                    <td className="px-3 py-2 font-mono text-xs text-brand-navy/90">
                      {r.code?.trim() ? r.code : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-brand-muted">{linkedLabel(r)}</td>
                    <td className="px-3 py-2">
                      <a
                        href={signupHref(r.conference_id, r.id)}
                        className="text-xs text-brand-gold hover:underline break-all"
                      >
                        Allocation sign-up link
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
            Committee
          </label>
          <select
            value={selectedConferenceId}
            onChange={(e) => onConferenceChange(e.target.value)}
            className="min-w-[240px] px-3 py-2 rounded-lg border border-brand-navy/15 bg-white text-brand-navy text-sm"
          >
            {conferences.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.name, c.committee].filter(Boolean).join(" — ") || c.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
        <Link
          href={`/smt/allocation-passwords?conference=${selectedConferenceId}`}
          className="text-sm text-brand-gold hover:underline"
        >
          Edit placard codes sheet →
        </Link>
      </div>

      {(message || error) && (
        <div
          className={`text-sm rounded-lg px-3 py-2 ${
            error ? "bg-red-50 text-red-800 border border-red-100" : "bg-emerald-50 text-emerald-900 border border-emerald-100"
          }`}
          role="status"
        >
          {error ?? message}
        </div>
      )}

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-navy">Roster · {heading}</h2>
        <p className="text-xs text-brand-muted">
          {rows.length} seat{rows.length === 1 ? "" : "s"}. Linked delegates cannot be deleted here.
        </p>
        <div className="overflow-x-auto rounded-lg border border-brand-navy/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
                <th className="px-3 py-2">Country / position</th>
                <th className="px-3 py-2">Placard code</th>
                <th className="px-3 py-2">Assigned account</th>
                <th className="px-3 py-2">Sign-up link</th>
                <th className="px-3 py-2 w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-brand-muted">
                    No seats yet. Add rows or import a CSV.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const formId = `alloc-row-${r.id}`;
                  if (r.user_id) {
                    return (
                      <tr key={r.id} className="border-t border-brand-navy/5">
                        <td className="px-3 py-2 font-medium text-brand-navy">{r.country}</td>
                        <td className="px-3 py-2 font-mono text-xs text-brand-navy/90">
                          {r.code?.trim() ? r.code : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-amber-800/90">{linkedLabel(r)}</td>
                        <td className="px-3 py-2">
                          <a
                            href={signupHref(selectedConferenceId, r.id)}
                            className="text-xs text-brand-gold hover:underline break-all"
                          >
                            Allocation sign-up link
                          </a>
                        </td>
                        <td className="px-3 py-2 text-xs text-brand-muted">—</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={r.id} className="border-t border-brand-navy/5">
                      <td className="px-3 py-2">
                        <form id={formId} onSubmit={onUpdate} className="m-0">
                          <input type="hidden" name="allocation_id" value={r.id} />
                          <input
                            name="country"
                            defaultValue={r.country}
                            required
                            className="w-full min-w-[120px] px-2 py-1 rounded border border-brand-navy/15 text-sm"
                          />
                        </form>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          form={formId}
                          name="code"
                          defaultValue={r.code ?? ""}
                          placeholder="Optional"
                          className="w-full min-w-[88px] px-2 py-1 rounded border border-brand-navy/15 font-mono text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-brand-muted">{linkedLabel(r)}</td>
                      <td className="px-3 py-2">
                        <a
                          href={signupHref(selectedConferenceId, r.id)}
                          className="text-xs text-brand-gold hover:underline break-all"
                        >
                          Allocation sign-up link
                        </a>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            form={formId}
                            disabled={pending}
                            className="text-xs px-2 py-1 rounded bg-brand-gold text-brand-navy font-medium disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(r.id)}
                            disabled={pending}
                            className="text-xs text-red-700 hover:underline disabled:opacity-50"
                          >
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

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-brand-navy">Add one seat</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onQuickAddChairSeat("Head Chair")}
            disabled={pending}
            className="px-3 py-2 rounded-lg border border-brand-navy/20 text-brand-navy text-sm font-medium hover:bg-brand-cream disabled:opacity-50"
          >
            Add Head Chair allocation
          </button>
          <button
            type="button"
            onClick={() => onQuickAddChairSeat("Co-chair")}
            disabled={pending}
            className="px-3 py-2 rounded-lg border border-brand-navy/20 text-brand-navy text-sm font-medium hover:bg-brand-cream disabled:opacity-50"
          >
            Add Co-chair allocation
          </button>
        </div>
        <form onSubmit={onAdd} className="flex flex-wrap gap-2 items-end">
          <input type="hidden" name="conference_id" value={selectedConferenceId} />
          <div>
            <label className="block text-xs text-brand-muted mb-1">Country / position</label>
            <input
              name="country"
              required
              placeholder="e.g. France"
              className="px-3 py-2 rounded-lg border border-brand-navy/15 text-sm w-56"
            />
          </div>
          <div>
            <label className="block text-xs text-brand-muted mb-1">Placard code (optional)</label>
            <input
              name="code"
              placeholder="e.g. DIS-014"
              className="px-3 py-2 rounded-lg border border-brand-navy/15 font-mono text-sm w-36"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-brand-paper text-brand-navy text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-navy">Import CSV</h2>
        <p className="text-sm text-brand-muted max-w-2xl">
          One seat per line: <span className="font-mono">country,optional_code</span>. A header row with
          &quot;country&quot; is fine. UTF-8 files from Excel/Google Sheets export work.{" "}
          <strong>Append</strong> skips names already on this committee.{" "}
          <strong>Replace unassigned</strong> removes every open seat (not linked to a delegate), then
          loads the file—keeps linked delegates safe.
        </p>
        <form onSubmit={onImport} className="space-y-3">
          <input type="hidden" name="conference_id" value={selectedConferenceId} />
          <input type="hidden" name="mode" value={importMode} />
          <div className="flex flex-wrap gap-4 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFile(f);
              }}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="mode_ui"
                checked={importMode === "append"}
                onChange={() => setImportMode("append")}
              />
              Append
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="mode_ui"
                checked={importMode === "replace_unassigned"}
                onChange={() => setImportMode("replace_unassigned")}
              />
              Replace unassigned only
            </label>
          </div>
          <textarea
            name="csv_text"
            value={csvText}
            onChange={(e) => {
              const v = e.target.value;
              setCsvText(v);
              try {
                const parsed = parseAllocationCsv(v);
                setCsvPreview({ n: parsed.length, sample: parsed.slice(0, 5) });
              } catch {
                setCsvPreview(null);
              }
            }}
            rows={8}
            placeholder={"France,DIS-001\nGermany,DIS-002\nJapan"}
            className="w-full max-w-3xl px-3 py-2 rounded-lg border border-brand-navy/15 font-mono text-sm"
          />
          {csvPreview && csvPreview.n > 0 ? (
            <p className="text-xs text-brand-muted">
              Parsed <strong>{csvPreview.n}</strong> row(s). Sample:{" "}
              {csvPreview.sample.map((s) => s.code ? `${s.country} (${s.code})` : s.country).join(" · ")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending || !csvText.trim()}
              className="px-4 py-2 rounded-lg bg-brand-paper text-brand-navy text-sm font-medium disabled:opacity-50"
            >
              Run import
            </button>
            <button
              type="button"
              onClick={onGenerateCodes}
              disabled={pending}
              className="px-4 py-2 rounded-lg border border-brand-navy/20 text-brand-navy text-sm font-medium hover:bg-brand-cream disabled:opacity-50"
            >
              Generate missing random codes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
