"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

type RoleKey = "admin" | "smt" | "chair" | "delegate";

const HREFS: Record<RoleKey, string[]> = {
  admin: [
    "/conference-setup?next=%2Fadmin",
    "/admin",
    "/admin",
    "/smt",
  ],
  smt: ["/smt/conference", "/smt/room-codes", "/smt/allocation-matrix", "/documents"],
  chair: [
    "/chair/allocation-matrix",
    "/chair/session/roll-call",
    "/chair/session/timer",
    "/chair/digital-room",
  ],
  delegate: ["/profile", "/documents", "/documents", "/committee-room"],
};

const STEP_LABEL_KEYS = ["step1Label", "step2Label", "step3Label", "step4Label"] as const;
const STEP_DETAIL_KEYS = ["step1Detail", "step2Detail", "step3Detail", "step4Detail"] as const;

export function RoleSetupChecklist({ role }: { role: RoleKey }) {
  const t = useTranslations(`roleSetupChecklist.${role}`);
  const hrefs = HREFS[role];

  return (
    <section className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
      <h2 className="font-display text-lg font-semibold text-brand-navy">{t("title")}</h2>
      <p className="mt-1 text-sm text-brand-muted">{t("subtitle")}</p>
      <ol className="mt-4 space-y-2">
        {hrefs.map((href, i) => (
          <li
            key={`${role}-${href}-${STEP_LABEL_KEYS[i]}`}
            className="rounded-lg border border-brand-navy/10 bg-black/10 px-3 py-2"
          >
            <p className="text-sm font-medium text-brand-navy">
              {i + 1}.{" "}
              <Link href={href} className="text-brand-accent hover:underline">
                {t(STEP_LABEL_KEYS[i])}
              </Link>
            </p>
            <p className="mt-0.5 text-xs text-brand-muted">{t(STEP_DETAIL_KEYS[i])}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
