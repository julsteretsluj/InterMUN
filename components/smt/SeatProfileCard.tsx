// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SeatRosterInfo } from "@/lib/smt-acting-seat";

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-[12px] border border-[#D1D1D6] bg-white px-3 py-2.5 dark:border-white/12 dark:bg-black/25">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-[#6E6E73]">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-[#1D1D1F] dark:text-zinc-100">
        {value?.trim() ? value : "—"}
      </dd>
    </div>
  );
}

/**
 * Seat / roster details for staff, including seats nobody has claimed yet.
 * Contact details only render when `showContact` is set (SMT / admin).
 */
export function SeatProfileCard({
  seat,
  heading,
  showContact,
}: {
  seat: SeatRosterInfo;
  heading: string;
  showContact: boolean;
}) {
  return (
    <section className="rounded-[16px] border border-[#D1D1D6] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-white/12 dark:bg-black/20 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">{heading}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em] text-[#1D1D1F] dark:text-zinc-100">
            {seat.name ?? seat.country ?? "Unnamed seat"}
          </h2>
          <p className="mt-0.5 text-sm text-[#6E6E73]">
            {[seat.country, seat.committee].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span
          className={
            seat.signedUp
              ? "rounded-[980px] bg-[#007AFF]/10 px-3 py-1 text-xs font-semibold text-[#007AFF]"
              : "rounded-[980px] border border-[#D1D1D6] bg-[#F2F2F7] px-3 py-1 text-xs font-semibold text-[#6E6E73]"
          }
        >
          {seat.signedUp ? "Signed up" : "Not signed up yet"}
        </span>
      </div>
      {!seat.signedUp ? (
        <p className="mt-3 max-w-2xl text-sm text-[#6E6E73]">
          Nobody has claimed this seat yet, so there is no account profile. These details come from the
          allocation matrix.
        </p>
      ) : null}
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        <Row label="Name" value={seat.name} />
        <Row label="School" value={seat.school} />
        <Row label="Committee" value={seat.committee} />
        <Row label="Allocation" value={seat.country} />
        {seat.pronouns ? <Row label="Pronouns" value={seat.pronouns} /> : null}
        {seat.grade ? <Row label="Grade" value={seat.grade} /> : null}
        {showContact ? <Row label="Contact email" value={seat.email} /> : null}
        {showContact && seat.rosterStatus ? <Row label="Roster status" value={seat.rosterStatus} /> : null}
      </dl>
    </section>
  );
}
