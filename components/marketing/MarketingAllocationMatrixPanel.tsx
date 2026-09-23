// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

import { PREVIEW_CARD, PREVIEW_LABEL } from "./marketing-preview-styles";

type DemoRow = {
  id: string;
  country: string;
  code: string;
  linkedName: string | null;
  linkedRole: "delegate" | "chair" | null;
};

type CommitteeTab = {
  id: string;
  label: string;
  heading: string;
  quickAddLabels: string[];
  rows: DemoRow[];
};

const COMMITTEE_FIXTURES: CommitteeTab[] = [
  {
    id: "ecosoc",
    label: "ECOSOC",
    heading: "Food security — ECOSOC",
    quickAddLabels: ["Head Chair", "Co-chair"],
    rows: [
      { id: "e1", country: "Kenya", code: "KEN-014", linkedName: "Amina O.", linkedRole: "delegate" },
      { id: "e2", country: "Mexico", code: "MEX-022", linkedName: "Luis R.", linkedRole: "delegate" },
      { id: "e3", country: "Norway", code: "", linkedName: null, linkedRole: null },
      { id: "e4", country: "Philippines", code: "PHL-009", linkedName: null, linkedRole: null },
      { id: "e5", country: "Sweden", code: "SWE-031", linkedName: "Erik L.", linkedRole: "delegate" },
    ],
  },
  {
    id: "legal",
    label: "Legal",
    heading: "International law — Legal",
    quickAddLabels: ["Head Chair", "Co-chair"],
    rows: [
      { id: "l1", country: "Canada", code: "CAN-004", linkedName: "Maya T.", linkedRole: "delegate" },
      { id: "l2", country: "Ghana", code: "", linkedName: null, linkedRole: null },
      { id: "l3", country: "Italy", code: "ITA-018", linkedName: null, linkedRole: null },
    ],
  },
  {
    id: "who",
    label: "WHO",
    heading: "Global health — WHO",
    quickAddLabels: ["Head Chair", "Co-chair"],
    rows: [
      { id: "w1", country: "Peru", code: "PER-007", linkedName: "Sofia M.", linkedRole: "delegate" },
      { id: "w2", country: "Spain", code: "ESP-012", linkedName: null, linkedRole: null },
    ],
  },
];

function linkedLabel(
  row: Pick<DemoRow, "linkedName" | "linkedRole">,
  t: (key: string) => string
): string {
  if (!row.linkedName) return t("linkedOpen");
  const role =
    row.linkedRole === "chair"
      ? t("linkedRoleChair")
      : row.linkedRole === "delegate"
        ? t("linkedRoleDelegate")
        : t("linkedRoleLinked");
  return `${role}: ${row.linkedName}`;
}

export function MarketingAllocationMatrixPanel({ className }: { className?: string }) {
  const t = useTranslations("allocationMatrixManager");
  const tPreview = useTranslations("marketing.rolePreviews.secretariat");
  const [activeId, setActiveId] = useState(COMMITTEE_FIXTURES[0]!.id);
  const [rowsByCommittee, setRowsByCommittee] = useState<Record<string, DemoRow[]>>(() =>
    Object.fromEntries(COMMITTEE_FIXTURES.map((c) => [c.id, c.rows.map((r) => ({ ...r }))]))
  );
  const [message, setMessage] = useState<string | null>(null);

  const active = useMemo(
    () => COMMITTEE_FIXTURES.find((c) => c.id === activeId) ?? COMMITTEE_FIXTURES[0]!,
    [activeId]
  );
  const rows = rowsByCommittee[active.id] ?? [];

  const removeRow = useCallback(
    (rowId: string) => {
      setRowsByCommittee((prev) => ({
        ...prev,
        [active.id]: (prev[active.id] ?? []).filter((row) => row.id !== rowId),
      }));
      setMessage(t("deletedRow"));
      window.setTimeout(() => setMessage(null), 2200);
    },
    [active.id, t]
  );

  const quickAddSeat = useCallback(
    (label: string) => {
      const id = `${active.id}-${Date.now()}`;
      setRowsByCommittee((prev) => ({
        ...prev,
        [active.id]: [
          ...(prev[active.id] ?? []),
          { id, country: label, code: "", linkedName: null, linkedRole: null },
        ],
      }));
      setMessage(t("addedSeat", { label }));
      window.setTimeout(() => setMessage(null), 2200);
    },
    [active.id, t]
  );

  const addOpenSeat = useCallback(
    (country: string) => {
      const trimmed = country.trim();
      if (!trimmed) return;
      const id = `${active.id}-${Date.now()}`;
      setRowsByCommittee((prev) => ({
        ...prev,
        [active.id]: [
          ...(prev[active.id] ?? []),
          { id, country: trimmed, code: "", linkedName: null, linkedRole: null },
        ],
      }));
      setMessage(t("addedRow"));
      window.setTimeout(() => setMessage(null), 2200);
    },
    [active.id, t]
  );

  return (
    <div className={cn(PREVIEW_CARD, "space-y-4", className)}>
      <div>
        <span className={PREVIEW_LABEL}>{tPreview("allocationLabel")}</span>
        <p className="mt-1 text-xs text-[var(--clicky-ink-faint)]">{t("showingOneCommitteeAtATime")}</p>
      </div>

      {message ? (
        <p
          className="rounded-lg border border-[color-mix(in_srgb,var(--clicky-blue)_22%,#d4d4d8)] bg-[color-mix(in_srgb,var(--clicky-blue)_10%,#ffffff)] px-3 py-2 text-xs text-[var(--clicky-ink)]"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <section className="space-y-3 rounded-xl border border-[var(--clicky-line)] bg-[var(--clicky-paper)] p-3">
        <div>
          <h3 className="font-sans text-sm font-semibold text-[var(--clicky-ink)]">
            {t("rosterHeading", { heading: active.heading })}
          </h3>
          <p className="mt-0.5 text-[0.65rem] text-[var(--clicky-ink-faint)]">
            {t("seatsSummary", { count: rows.length })} {t("linkedDelegatesCannotBeDeleted")}
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--clicky-line)] bg-white">
          <table className="w-full min-w-[32rem] text-xs">
            <thead>
              <tr className="bg-[var(--clicky-paper)] text-left text-[0.65rem]  tracking-wider text-[var(--clicky-ink-faint)]">
                <th className="px-2.5 py-2">{t("countryPosition")}</th>
                <th className="px-2.5 py-2">{t("placardCode")}</th>
                <th className="px-2.5 py-2">{t("assignedAccount")}</th>
                <th className="px-2.5 py-2">{t("signupLink")}</th>
                <th className="px-2.5 py-2 w-[5.5rem]">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const linked = Boolean(row.linkedName);
                return (
                  <tr key={row.id} className="border-t border-[var(--clicky-line)]">
                    <td className="px-2.5 py-2 font-medium text-[var(--clicky-ink)]">{row.country}</td>
                    <td className="px-2.5 py-2">
                      <span className="font-mono text-[0.65rem] text-[var(--clicky-ink-soft)]">
                        {row.code.trim() ? row.code : t("dash")}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-2.5 py-2 text-[0.65rem]",
                        linked ? "text-[var(--clicky-ink-soft)]" : "text-[var(--clicky-ink-faint)]"
                      )}
                    >
                      {linkedLabel(row, t)}
                    </td>
                    <td className="px-2.5 py-2">
                      <span className="text-[0.65rem] text-[var(--clicky-blue)]">{t("allocationSignupLink")}</span>
                    </td>
                    <td className="px-2.5 py-2">
                      {linked ? (
                        <span className="text-[0.65rem] text-[var(--clicky-ink-faint)]">{t("dash")}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="text-[0.65rem] font-medium text-red-700 hover:underline"
                        >
                          {t("remove")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-[var(--clicky-line)] bg-[var(--clicky-paper)] p-3">
        <h3 className="font-sans text-sm font-semibold text-[var(--clicky-ink)]">{t("addOneSeat")}</h3>
        <div className="flex flex-wrap gap-1.5">
          {active.quickAddLabels.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => quickAddSeat(label)}
              className="rounded-lg border border-[var(--clicky-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--clicky-ink)] hover:bg-[var(--clicky-paper)]"
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            addOpenSeat(String(fd.get("country") ?? ""));
            e.currentTarget.reset();
          }}
        >
          <div>
            <label className="mb-1 block text-[0.65rem] text-[var(--clicky-ink-faint)]">{t("countryPosition")}</label>
            <input
              name="country"
              required
              placeholder={t("countryPlaceholder")}
              className="w-40 rounded-lg border border-[var(--clicky-line)] px-2.5 py-1.5 text-xs text-[var(--clicky-ink)]"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-[var(--clicky-line)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--clicky-ink)] hover:bg-[var(--clicky-paper)]"
          >
            {t("add")}
          </button>
        </form>
      </section>

      <div className="rounded-lg border border-[var(--clicky-line)] bg-[var(--clicky-paper)] p-1.5">
        <div className="flex gap-1.5 overflow-x-auto">
          {COMMITTEE_FIXTURES.map((tab) => {
            const selected = tab.id === active.id;
            return (
              <button
                key={tab.id}
                type="button"
                title={tab.heading}
                onClick={() => setActiveId(tab.id)}
                className={cn(
                  "shrink-0 rounded-lg border px-2.5 py-1 text-[0.65rem] font-semibold transition",
                  selected
                    ? "border-[color-mix(in_srgb,var(--clicky-blue)_60%,#d4d4d8)] bg-[color-mix(in_srgb,var(--clicky-blue)_14%,#ffffff)] text-[var(--clicky-ink)]"
                    : "border-[var(--clicky-line)] bg-white text-[var(--clicky-ink-soft)] hover:bg-[var(--clicky-paper)]"
                )}
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
