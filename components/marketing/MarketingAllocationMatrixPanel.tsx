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
        <p className="mt-1 text-xs text-zinc-500">{t("showingOneCommitteeAtATime")}</p>
      </div>

      {message ? (
        <p
          className="rounded-lg border border-[color-mix(in_srgb,var(--accent)_22%,#d4d4d8)] bg-[color-mix(in_srgb,var(--accent)_10%,#ffffff)] px-3 py-2 text-xs text-zinc-900"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
        <div>
          <h3 className="font-sans text-sm font-semibold text-zinc-900">
            {t("rosterHeading", { heading: active.heading })}
          </h3>
          <p className="mt-0.5 text-[0.65rem] text-zinc-500">
            {t("seatsSummary", { count: rows.length })} {t("linkedDelegatesCannotBeDeleted")}
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-[32rem] text-xs">
            <thead>
              <tr className="bg-zinc-50 text-left text-[0.65rem] uppercase tracking-wider text-zinc-500">
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
                  <tr key={row.id} className="border-t border-zinc-100">
                    <td className="px-2.5 py-2 font-medium text-zinc-900">{row.country}</td>
                    <td className="px-2.5 py-2">
                      <span className="font-mono text-[0.65rem] text-zinc-700">
                        {row.code.trim() ? row.code : t("dash")}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-2.5 py-2 text-[0.65rem]",
                        linked ? "text-amber-800/90" : "text-zinc-500"
                      )}
                    >
                      {linkedLabel(row, t)}
                    </td>
                    <td className="px-2.5 py-2">
                      <span className="text-[0.65rem] text-[var(--accent)]">{t("allocationSignupLink")}</span>
                    </td>
                    <td className="px-2.5 py-2">
                      {linked ? (
                        <span className="text-[0.65rem] text-zinc-400">{t("dash")}</span>
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

      <section className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
        <h3 className="font-sans text-sm font-semibold text-zinc-900">{t("addOneSeat")}</h3>
        <div className="flex flex-wrap gap-1.5">
          {active.quickAddLabels.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => quickAddSeat(label)}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
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
            <label className="mb-1 block text-[0.65rem] text-zinc-500">{t("countryPosition")}</label>
            <input
              name="country"
              required
              placeholder={t("countryPlaceholder")}
              className="w-40 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
          >
            {t("add")}
          </button>
        </form>
      </section>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-1.5">
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
                    ? "border-[color-mix(in_srgb,var(--accent)_60%,#d4d4d8)] bg-[color-mix(in_srgb,var(--accent)_14%,#ffffff)] text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
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
