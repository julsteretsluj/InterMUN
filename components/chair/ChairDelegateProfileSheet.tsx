// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AppleSheet } from "@/components/ui/AppleSheet";
import { ChairDelegateAvatar } from "@/components/chair/ChairDelegateAvatar";

export type ChairDelegateProfileInfo = {
  userId: string;
  country: string;
  countryDisplay?: string | null;
  partyLabel?: string | null;
  committee?: string | null;
  email: string | null;
  name: string | null;
  username: string | null;
  pronouns: string | null;
  school: string | null;
  grade: string | null;
  notes: string | null;
  profilePictureUrl: string | null;
  linkedRole: string | null;
};

type SheetContextValue = {
  openDelegate: (delegate: ChairDelegateProfileInfo) => void;
};

const ChairDelegateProfileSheetContext = createContext<SheetContextValue | null>(null);

function dash(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#D1D1D6] bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/70">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-brand-navy dark:text-zinc-100">{value}</dd>
    </div>
  );
}

export function ChairDelegateProfileSheetProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("chairAllocationMatrixPage.delegateProfile");
  const [selected, setSelected] = useState<ChairDelegateProfileInfo | null>(null);
  const open = Boolean(selected);

  const openDelegate = useCallback((delegate: ChairDelegateProfileInfo) => {
    setSelected(delegate);
  }, []);

  const value = useMemo(() => ({ openDelegate }), [openDelegate]);

  const displayName = dash(selected?.name, t("unnamed"));
  const seatLabel = dash(selected?.countryDisplay || selected?.country, t("dash"));

  return (
    <ChairDelegateProfileSheetContext.Provider value={value}>
      {children}
      <AppleSheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
        }}
        title={t("title")}
        detent="large"
        closeLabel={t("close")}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <ChairDelegateAvatar
                name={displayName}
                profilePictureUrl={selected.profilePictureUrl}
                size="lg"
              />
              <p className="mt-3 font-sans text-lg font-semibold text-brand-navy dark:text-zinc-50">
                {displayName}
              </p>
              <p className="mt-1 text-sm text-brand-muted">
                {seatLabel}
                {selected.partyLabel?.trim() ? ` · ${selected.partyLabel.trim()}` : ""}
              </p>
            </div>

            <dl className="grid gap-2 sm:grid-cols-2">
              <InfoRow label={t("fields.allocation")} value={dash(selected.country, t("dash"))} />
              {selected.committee?.trim() ? (
                <InfoRow label={t("fields.committee")} value={selected.committee.trim()} />
              ) : null}
              <InfoRow label={t("fields.email")} value={dash(selected.email, t("dash"))} />
              <InfoRow label={t("fields.username")} value={dash(selected.username, t("dash"))} />
              <InfoRow label={t("fields.pronouns")} value={dash(selected.pronouns, t("dash"))} />
              <InfoRow label={t("fields.school")} value={dash(selected.school, t("dash"))} />
              <InfoRow label={t("fields.grade")} value={dash(selected.grade, t("dash"))} />
              <InfoRow label={t("fields.role")} value={dash(selected.linkedRole, t("dash"))} />
              <div className="sm:col-span-2">
                <InfoRow label={t("fields.notes")} value={dash(selected.notes, t("dash"))} />
              </div>
            </dl>

            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href={`/committee-room/person/${selected.userId}`}
                className="inline-flex items-center justify-center rounded-lg bg-[#007AFF] px-3 py-2 text-sm font-medium text-white hover:opacity-95"
              >
                {t("openFullProfile")}
              </Link>
              <Link
                href={`/chats-notes?forProfile=${encodeURIComponent(selected.userId)}`}
                className="inline-flex items-center justify-center rounded-lg border border-[#D1D1D6] bg-white px-3 py-2 text-sm font-medium text-brand-navy hover:bg-[#F2F2F7]/60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {t("openChat")}
              </Link>
            </div>
          </div>
        ) : null}
      </AppleSheet>
    </ChairDelegateProfileSheetContext.Provider>
  );
}

export function useChairDelegateProfileSheet() {
  const ctx = useContext(ChairDelegateProfileSheetContext);
  if (!ctx) {
    throw new Error("useChairDelegateProfileSheet must be used within ChairDelegateProfileSheetProvider");
  }
  return ctx;
}

export function ChairDelegateProfileTrigger({
  delegate,
  className,
  children,
}: {
  delegate: ChairDelegateProfileInfo;
  className?: string;
  children: ReactNode;
}) {
  const { openDelegate } = useChairDelegateProfileSheet();
  const t = useTranslations("chairAllocationMatrixPage.delegateProfile");
  return (
    <button
      type="button"
      onClick={() => openDelegate(delegate)}
      className={className}
      aria-label={t("viewAria", { name: dash(delegate.name, delegate.country) })}
    >
      {children}
    </button>
  );
}
