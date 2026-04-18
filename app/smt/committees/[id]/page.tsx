import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { ChairLiveFloor } from "@/components/session/ChairLiveFloor";
import { VirtualCommitteeRoom } from "@/components/committee-room/VirtualCommitteeRoom";
import { CommitteeRoomStaffControls } from "@/components/committee-room/CommitteeRoomStaffControls";
import {
  formatCommitteeCardTitle,
  resolveCommitteeDisplayTags,
  resolveCommitteeFullName,
} from "@/lib/committee-card-display";
import {
  ageRangeTagClass,
  difficultyTagClass,
  eslFriendlyTagClass,
  formatTagClass,
} from "@/lib/committee-tag-styles";
import { loadCommitteeRoomPayload } from "@/lib/committee-room-payload";
import { SessionHistoryPanel } from "@/components/session/SessionHistoryPanel";

function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">{label}</dt>
      <dd className="text-sm text-brand-navy mt-0.5 break-words">{children}</dd>
    </div>
  );
}

export default async function SmtCommitteeLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const eventId = await getActiveEventId();

  const { data: conf } = await supabase
    .from("conferences")
    .select(
      "id, event_id, name, committee, tagline, committee_code, room_code, committee_full_name, chair_names, committee_logo_url"
    )
    .eq("id", id)
    .maybeSingle();

  if (!conf) notFound();

  if (eventId && conf.event_id !== eventId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-brand-navy">
        This committee belongs to a different conference than the one you have selected.{" "}
        <Link href="/event-gate?next=%2Fsmt" className="text-brand-accent font-medium underline">
          Switch event
        </Link>{" "}
        or open it from{" "}
        <Link href="/smt" className="text-brand-accent font-medium underline">
          Live committees
        </Link>
        .
      </div>
    );
  }

  const [roomPayload, resolutionCount, openVotesCount] = await Promise.all([
    loadCommitteeRoomPayload(supabase, conf.id, {
      includeDelegatesForStaff: true,
      chairNamesHint: conf.chair_names,
    }),
    supabase
      .from("resolutions")
      .select("id", { count: "exact", head: true })
      .eq("conference_id", conf.id),
    supabase
      .from("vote_items")
      .select("id", { count: "exact", head: true })
      .eq("conference_id", conf.id)
      .is("closed_at", null),
  ]);

  const { data: chairProfiles } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "chair")
    .order("name");

  const staffAllocs = roomPayload.staffAllocations;
  const totalSeats = staffAllocs.length;
  const filledSeats = staffAllocs.filter((a) => a.user_id).length;

  const displayTitle = formatCommitteeCardTitle(conf.committee_full_name, conf.committee);
  const officialName = resolveCommitteeFullName(conf.committee_full_name, conf.committee);
  const displayTags = resolveCommitteeDisplayTags(conf.committee);

  return (
    <div className="space-y-8">
      <Link href="/smt" className="text-sm text-brand-accent hover:underline inline-block">
        ← All committees
      </Link>

      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <div className="flex items-start gap-4">
            {conf.committee_logo_url ? (
              <img
                src={conf.committee_logo_url}
                alt={`${conf.committee ?? "Committee"} logo`}
                className="h-14 w-14 object-contain rounded-md bg-white/70 border border-brand-navy/10 mt-1"
              />
            ) : null}
            <h1 className="font-display text-2xl font-semibold text-brand-navy">{displayTitle}</h1>
          </div>
          <p className="text-xs text-brand-muted mt-2 uppercase tracking-wide">Committee overview</p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetaItem label="Session topic (agenda)">
            {conf.name?.trim() ? conf.name : "—"}
          </MetaItem>
          {conf.tagline?.trim() ? (
            <MetaItem label="Tagline">{conf.tagline}</MetaItem>
          ) : null}
          <MetaItem label="Official committee name">{officialName ?? "—"}</MetaItem>
          <MetaItem label="Chamber / acronym">{conf.committee?.trim() || "—"}</MetaItem>
          <MetaItem label="Difficulty">
            {displayTags?.difficulty ? (
              <span className={difficultyTagClass(displayTags.difficulty)}>{displayTags.difficulty}</span>
            ) : (
              "—"
            )}
          </MetaItem>
          <MetaItem label="Format">
            {displayTags?.format ? (
              <span className={formatTagClass(displayTags.format)}>{displayTags.format}</span>
            ) : (
              "—"
            )}
          </MetaItem>
          <MetaItem label="Age range">
            {displayTags?.ageRange ? (
              <span className={ageRangeTagClass()}>{displayTags.ageRange}</span>
            ) : (
              "—"
            )}
          </MetaItem>
          <MetaItem label="ESL-friendly">
            {displayTags ? (
              <span className={eslFriendlyTagClass(displayTags.eslFriendly)}>
                {displayTags.eslFriendly ? "Yes" : "No"}
              </span>
            ) : (
              "—"
            )}
          </MetaItem>
          <MetaItem label="Dais (listed)">{conf.chair_names?.trim() || "—"}</MetaItem>
          <MetaItem label="Committee / room code (second gate)">
            {conf.committee_code?.trim() || conf.room_code?.trim() ? (
              <span className="font-mono tracking-widest">
                {conf.committee_code?.trim() || conf.room_code}
              </span>
            ) : (
              "—"
            )}
          </MetaItem>
          <MetaItem label="Seats">
            {filledSeats} filled · {totalSeats} allocated
          </MetaItem>
          <MetaItem label="Resolutions">{resolutionCount.count ?? 0}</MetaItem>
          <MetaItem label="Open votes">{openVotesCount.count ?? 0}</MetaItem>
        </dl>

        <p className="text-xs text-brand-muted border-t border-brand-navy/10 pt-4">
          Edit committee session metadata and chair names under{" "}
          <Link href="/smt/conference" className="text-brand-accent font-medium hover:underline">
            Event & committee sessions
          </Link>
          . Codes under{" "}
          <Link href="/smt/room-codes" className="text-brand-accent font-medium hover:underline">
            Room codes & chairs
          </Link>
          .
        </p>
      </div>

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Digital committee room</h2>
        <p className="text-sm text-brand-navy/90 max-w-2xl">
          Same virtual floor delegates see under <span className="font-medium">Committee room</span> in the
          delegate dashboard (placards and dais use this committee&apos;s allocations).
        </p>
        <VirtualCommitteeRoom
          conferenceName={conf.name ?? "Conference"}
          committeeName={conf.committee?.trim() || "Committee"}
          placards={roomPayload.placards}
          dais={roomPayload.dais}
          helperText="Secretariat view: live preview from this committee's allocation matrix. Assign seats below or in Allocation matrix."
        />
        <CommitteeRoomStaffControls
          allocations={roomPayload.staffAllocations}
          delegates={roomPayload.delegates}
          chairs={(chairProfiles ?? []).map((c) => ({ id: c.id, name: c.name ?? null }))}
        />
      </section>

      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm space-y-8">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Live floor</h2>
          <ChairLiveFloor conferenceId={conf.id} theme="light" observeFloorOnly />
        </section>

        <p className="text-xs text-brand-muted pt-2 border-t border-brand-navy/10">
          Live speaker queue, roll call, and timers for this committee—same data chairs see on the session floor.
        </p>
      </div>

      <SessionHistoryPanel conferenceId={conf.id} />
    </div>
  );
}
