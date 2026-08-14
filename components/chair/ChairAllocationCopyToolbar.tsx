// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { isCommitteeChairSeatLabel } from "@/lib/dais-seat-plan";

export type ChairAllocationCopyRow = {
  country: string;
  email: string | null;
  linkedRole: string | null;
};

function isChairSeatRow(row: ChairAllocationCopyRow): boolean {
  if (isCommitteeChairSeatLabel(row.country)) return true;
  if ((row.linkedRole ?? "").trim().toLowerCase() === "chair") return true;
  const label = row.country.trim().toLowerCase();
  return label.includes("chair") || label.includes("editor");
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

function uniqueSortedEmails(rows: ChairAllocationCopyRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const email = row.email?.trim().toLowerCase();
    if (email) set.add(email);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function ChairAllocationCopyToolbar({ rows }: { rows: ChairAllocationCopyRow[] }) {
  const t = useTranslations("chairAllocationMatrixPage.copy");
  const [msg, setMsg] = useState<string | null>(null);

  async function runCopy(kind: "emailsAll" | "emailsDelegates" | "allocations") {
    let text = "";
    let count = 0;
    if (kind === "emailsAll") {
      const emails = uniqueSortedEmails(rows);
      text = emails.join(", ");
      count = emails.length;
    } else if (kind === "emailsDelegates") {
      const emails = uniqueSortedEmails(rows.filter((r) => !isChairSeatRow(r)));
      text = emails.join(", ");
      count = emails.length;
    } else {
      const seats = rows
        .filter((r) => !isChairSeatRow(r))
        .map((r) => r.country.trim())
        .filter(Boolean);
      const unique = [...new Set(seats)];
      text = unique.join("\n");
      count = unique.length;
    }

    if (!text) {
      setMsg(t("empty"));
      return;
    }
    const ok = await copyText(text);
    setMsg(ok ? t("copied", { count }) : t("failed"));
  }

  return (
    <div className="mb-4 rounded-xl border border-[var(--hairline)] bg-[var(--material-thin)] px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{t("title")}</p>
      <p className="mt-1 text-xs text-brand-muted">{t("help")}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runCopy("emailsAll")}
          className="rounded-lg border border-[var(--hairline)] bg-white px-3 py-1.5 text-xs font-medium text-brand-navy hover:bg-brand-navy/5 dark:bg-black/20 dark:hover:bg-white/10"
        >
          {t("emailsIncludingChairs")}
        </button>
        <button
          type="button"
          onClick={() => void runCopy("emailsDelegates")}
          className="rounded-lg border border-[var(--hairline)] bg-white px-3 py-1.5 text-xs font-medium text-brand-navy hover:bg-brand-navy/5 dark:bg-black/20 dark:hover:bg-white/10"
        >
          {t("emailsExcludingChairs")}
        </button>
        <button
          type="button"
          onClick={() => void runCopy("allocations")}
          className="rounded-lg border border-[var(--hairline)] bg-white px-3 py-1.5 text-xs font-medium text-brand-navy hover:bg-brand-navy/5 dark:bg-black/20 dark:hover:bg-white/10"
        >
          {t("allocationsExcludingChairs")}
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs text-brand-navy/80">{msg}</p> : null}
    </div>
  );
}
