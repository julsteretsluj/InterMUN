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
import { useTranslations } from "next-intl";

export type MatrixRow = {
  id: string;
  country: string;
  user_id: string | null;
  linked_role: string | null;
  linked_name: string | null;
  code: string | null;
};

export function AllocationMatrixManagerClient({
  conferences,
  selectedConferenceId,
  rows,
}: {
  conferences: { id: string; name: string; committee: string | null }[];
  selectedConferenceId: string | null;
  rows: MatrixRow[];
}) {
  const t = useTranslations("allocationMatrixManager");
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
    if (!row.user_id) return t("linkedOpen");
    const role = row.linked_role?.trim().toLowerCase();
    const roleLabel =
      role === "chair" ? t("linkedRoleChair") : role === "delegate" ? t("linkedRoleDelegate") : t("linkedRoleLinked");
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
      flash(t("addedRow"), null);
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
      flash(t("addedSeat", { label }), null);
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
      flash(t("updatedRow"), null);
      router.refresh();
    });
  }

  async function onDelete(allocationId: string) {
    if (!confirm(t("confirmRemoveUnassignedSeat"))) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await smtDeleteAllocationRow(allocationId);
      if ("error" in res && res.error) {
        flash(null, res.error);
        return;
      }
      flash(t("deletedRow"), null);
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
      const insertedCount = Number(res.inserted ?? 0);
      const skippedCount = Number(res.skippedDup ?? 0);
      const parts = [t("importedRows", { count: insertedCount })];
      if (skippedCount > 0) parts.push(t("skippedDuplicates", { count: skippedCount }));
      if (res.replaceMode) parts.push(t("replacedUnassignedSeats"));
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
      const n = Number(("generated" in res ? res.generated : 0) ?? 0);
      flash(t("generatedRandomCodes", { count: n }), null);
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
        {t("addCommitteesFirst")}{" "}
        <Link href="/smt/conference" className="text-brand-accent font-medium hover:underline">
          {t("eventCommitteeSessionsLink")}
        </Link>
        .
      </p>
    );
  }

  const confLabel = conferences.find((c) => c.id === selectedConferenceId);
  const heading = confLabel
    ? [confLabel.name, confLabel.committee].filter(Boolean).join(" — ")
    : t("committeeFallback");
  const sheetTabs = conferences.map((c) => ({
    id: c.id,
    label: c.committee?.trim() || c.name?.trim() || c.id.slice(0, 8),
    title: [c.name, c.committee].filter(Boolean).join(" — ") || c.id.slice(0, 8),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
        <div className="text-sm text-brand-muted">
          {t("showingOneCommitteeAtATime")}
        </div>
        <Link
          href={`/smt/allocation-passwords?conference=${selectedConferenceId}`}
          className="text-sm text-brand-accent hover:underline"
        >
          {t("editPlacardCodesSheet")}
        </Link>
      </div>

      {(message || error) && (
        <div
          className={`text-sm rounded-lg px-3 py-2 ${
            error ? "bg-red-50 text-red-800 border border-red-100" : "bg-brand-accent/10 text-brand-navy border border-brand-accent/22"
          }`}
          role="status"
        >
          {error ?? message}
        </div>
      )}

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-navy">{t("rosterHeading", { heading })}</h2>
        <p className="text-xs text-brand-muted">
          {t("seatsSummary", { count: rows.length })} {t("linkedDelegatesCannotBeDeleted")}
        </p>
        <div className="overflow-x-auto rounded-lg border border-brand-navy/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
                <th className="px-3 py-2">{t("countryPosition")}</th>
                <th className="px-3 py-2">{t("placardCode")}</th>
                <th className="px-3 py-2">{t("assignedAccount")}</th>
                <th className="px-3 py-2">{t("signupLink")}</th>
                <th className="px-3 py-2 w-[120px]">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-brand-muted">
                    {t("noSeatsYet")}
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
                            className="text-xs text-brand-accent hover:underline break-all"
                          >
                            {t("allocationSignupLink")}
                          </a>
                        </td>
                        <td className="px-3 py-2 text-xs text-brand-muted">{t("dash")}</td>
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
                          placeholder={t("optional")}
                          className="w-full min-w-[88px] px-2 py-1 rounded border border-brand-navy/15 font-mono text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-brand-muted">{linkedLabel(r)}</td>
                      <td className="px-3 py-2">
                        <a
                          href={signupHref(selectedConferenceId, r.id)}
                          className="text-xs text-brand-accent hover:underline break-all"
                        >
                          {t("allocationSignupLink")}
                        </a>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            form={formId}
                            disabled={pending}
                            className="text-xs px-2 py-1 rounded bg-brand-accent text-white font-medium disabled:opacity-50"
                          >
                            {t("save")}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(r.id)}
                            disabled={pending}
                            className="text-xs text-red-700 hover:underline disabled:opacity-50"
                          >
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

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-brand-navy">{t("addOneSeat")}</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onQuickAddChairSeat("Head Chair")}
            disabled={pending}
            className="px-3 py-2 rounded-lg border border-brand-navy/20 text-brand-navy text-sm font-medium hover:bg-brand-cream disabled:opacity-50"
          >
            {t("addHeadChairAllocation")}
          </button>
          <button
            type="button"
            onClick={() => onQuickAddChairSeat("Co-chair")}
            disabled={pending}
            className="px-3 py-2 rounded-lg border border-brand-navy/20 text-brand-navy text-sm font-medium hover:bg-brand-cream disabled:opacity-50"
          >
            {t("addCoChairAllocation")}
          </button>
        </div>
        <form onSubmit={onAdd} className="flex flex-wrap gap-2 items-end">
          <input type="hidden" name="conference_id" value={selectedConferenceId} />
          <div>
            <label className="block text-xs text-brand-muted mb-1">{t("countryPosition")}</label>
            <input
              name="country"
              required
              placeholder={t("countryPlaceholder")}
              className="px-3 py-2 rounded-lg border border-brand-navy/15 text-sm w-56"
            />
          </div>
          <div>
            <label className="block text-xs text-brand-muted mb-1">{t("placardCodeOptional")}</label>
            <input
              name="code"
              placeholder={t("placardCodePlaceholder")}
              className="px-3 py-2 rounded-lg border border-brand-navy/15 font-mono text-sm w-36"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-brand-paper text-brand-navy text-sm font-medium disabled:opacity-50"
          >
            {t("add")}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-navy">{t("importCsv")}</h2>
        <p className="text-sm text-brand-muted max-w-2xl">
          {t("importHelpPrefix")} <span className="font-mono">country,optional_code</span>. {t("importHelpMiddle")}{" "}
          <strong>{t("append")}</strong> {t("appendHelp")} <strong>{t("replaceUnassigned")}</strong>{" "}
          {t("replaceUnassignedHelp")}
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
              {t("append")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="mode_ui"
                checked={importMode === "replace_unassigned"}
                onChange={() => setImportMode("replace_unassigned")}
              />
              {t("replaceUnassignedOnly")}
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
            placeholder={t("csvPlaceholder")}
            className="w-full max-w-3xl px-3 py-2 rounded-lg border border-brand-navy/15 font-mono text-sm"
          />
          {csvPreview && csvPreview.n > 0 ? (
            <p className="text-xs text-brand-muted">
              {t("parsedRowsSample", { count: csvPreview.n })}{" "}
              {csvPreview.sample.map((s) => s.code ? `${s.country} (${s.code})` : s.country).join(" · ")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending || !csvText.trim()}
              className="px-4 py-2 rounded-lg bg-brand-paper text-brand-navy text-sm font-medium disabled:opacity-50"
            >
              {t("runImport")}
            </button>
            <button
              type="button"
              onClick={onGenerateCodes}
              disabled={pending}
              className="px-4 py-2 rounded-lg border border-brand-navy/20 text-brand-navy text-sm font-medium hover:bg-brand-cream disabled:opacity-50"
            >
              {t("generateMissingRandomCodes")}
            </button>
          </div>
        </form>
      </section>
      <div className="sticky bottom-2 z-20 rounded-xl border border-brand-navy/15 bg-brand-paper/95 p-2 shadow-sm backdrop-blur">
        <div className="flex gap-2 overflow-x-auto">
          {sheetTabs.map((tab) => {
            const active = tab.id === selectedConferenceId;
            return (
              <button
                key={`bottom-${tab.id}`}
                type="button"
                title={tab.title}
                onClick={() => onConferenceChange(tab.id)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-brand-accent/60 bg-brand-accent/20 text-brand-navy"
                    : "border-brand-navy/15 bg-white text-brand-navy/80 hover:bg-brand-cream/70"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
