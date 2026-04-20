import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { MunPageShell } from "@/components/MunPageShell";
import { awardCategoryMeta } from "@/lib/awards";
import { DelegateMaterialsExportCard } from "@/components/materials/DelegateMaterialsExportCard";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { sortCountryLabelsForDisplay } from "@/lib/allocation-display-order";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { ProfileAwardsSummaryTabs } from "@/components/profile/ProfileAwardsSummaryTabs";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const roleLower = profile?.role?.toString().trim().toLowerCase();
  if (roleLower === "smt") {
    redirect("/smt");
  }
  if (roleLower === "admin") {
    redirect("/admin");
  }

  const { data: myAwards } = await supabase
    .from("award_assignments")
    .select("*")
    .eq("recipient_profile_id", user.id)
    .order("created_at", { ascending: true });
  const { data: myPendingNominations } = await supabase
    .from("award_nominations")
    .select("id, nomination_type, rank, evidence_note, committee_conference_id")
    .eq("nominee_profile_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const { data: mySeats } = await supabase
    .from("allocations")
    .select("id, conference_id, country")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  const seatIds = (mySeats ?? []).map((s) => s.id);
  const { data: myDelegatePoints } =
    seatIds.length > 0
      ? await supabase
          .from("chair_delegate_points")
          .select("id, allocation_id, point_text, created_at, conference_id")
          .in("allocation_id", seatIds)
          .order("created_at", { ascending: false })
      : { data: [] as { id: string; allocation_id: string; point_text: string; created_at: string; conference_id: string }[] };
  const { data: mySpeechNotes } =
    seatIds.length > 0
      ? await supabase
          .from("chair_speech_notes")
          .select("id, allocation_id, speaker_label, content, created_at, conference_id")
          .in("allocation_id", seatIds)
          .order("created_at", { ascending: false })
      : {
          data: [] as {
            id: string;
            allocation_id: string | null;
            speaker_label: string;
            content: string;
            created_at: string;
            conference_id: string;
          }[],
        };
  const { data: myMotions } =
    seatIds.length > 0
      ? await supabase
          .from("vote_items")
          .select("id, title, description, vote_type, procedure_code, created_at, conference_id, motioner_allocation_id")
          .in("motioner_allocation_id", seatIds)
          .order("created_at", { ascending: false })
      : {
          data: [] as {
            id: string;
            title: string | null;
            description: string | null;
            vote_type: string;
            procedure_code: string | null;
            created_at: string;
            conference_id: string;
            motioner_allocation_id: string | null;
          }[],
        };
  const seatById = new Map((mySeats ?? []).map((s) => [s.id, s]));

  const committeeIds = [
    ...new Set(
      [
        ...(myAwards ?? []).map((a) => a.committee_conference_id),
        ...(myPendingNominations ?? []).map((a) => a.committee_conference_id),
        ...(myDelegatePoints ?? []).map((a) => a.conference_id),
        ...(mySpeechNotes ?? []).map((a) => a.conference_id),
        ...(myMotions ?? []).map((a) => a.conference_id),
      ].filter((id): id is string => Boolean(id))
    ),
  ];
  const { data: awardConfs } =
    committeeIds.length > 0
      ? await supabase
          .from("conferences")
          .select("id, name, committee")
          .in("id", committeeIds)
      : { data: [] as { id: string; name: string; committee: string | null }[] };

  const committeeLabel = Object.fromEntries(
    (awardConfs ?? []).map((c) => [
      c.id,
      [c.name, c.committee].filter(Boolean).join(" — "),
    ])
  );

  const isDelegate = roleLower === "delegate";
  const canViewPrivate = !isDelegate;
  const activeConference = await getConferenceForDashboard({ role: roleLower });
  const crisisReportingEnabled = isCrisisCommittee(activeConference?.committee ?? null);

  const { data: allocationRows } = activeConference?.id
    ? await supabase
        .from("allocations")
        .select("country")
        .eq("conference_id", activeConference.id)
        .order("country", { ascending: true })
    : { data: [] as { country: string }[] };
  const { data: myAllocation } = activeConference?.id
    ? await supabase
        .from("allocations")
        .select("country")
        .eq("conference_id", activeConference.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null as { country?: string | null } | null };

  const availableAllocations = sortCountryLabelsForDisplay([
    ...new Set(
      (allocationRows ?? [])
        .map((row) => row.country?.trim())
        .filter((value): value is string => Boolean(value))
    ),
  ]);
  const welcomeCountry = myAllocation?.country?.trim() || profile?.country || "your country";
  const welcomeFlag = flagEmojiForCountryName(welcomeCountry);

  const delegateWelcome = isDelegate ? (
    <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-10 shadow-sm">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-brand-navy">
          Welcome delegate of {welcomeFlag} {welcomeCountry}
        </h2>
        <p className="mt-3 text-brand-muted">What would you like to start with?</p>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {[
            { href: "/documents", label: "Documents" },
            { href: "/chats-notes", label: "Notes" },
            { href: "/committee-room", label: "Committee room" },
            { href: "/running-notes", label: "Running Notes" },
            { href: "/ideas", label: "Ideas" },
            { href: "/guides", label: "Guides" },
            { href: "/sources", label: "Sources" },
            { href: "/resolutions", label: "Resolutions" },
            { href: "/speeches", label: "Speeches" },
            { href: "/stances", label: "Stances" },
            ...(crisisReportingEnabled
              ? ([
                  { href: "/crisis-slides", label: "Crisis slides" },
                  { href: "/report", label: "Report" },
                ] as const)
              : []),
            { href: "/voting", label: "Motions" },
            { href: "/voting", label: "Points" },
          ].map((item) => (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className="rounded-lg border border-brand-navy/20 px-3 py-2 text-sm font-medium text-brand-navy bg-black/25 hover:bg-brand-cream transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <MunPageShell title="Profile">
      {delegateWelcome}
      {isDelegate && <DelegateMaterialsExportCard />}
      {(myPendingNominations?.length ?? 0) > 0 && (myAwards?.length ?? 0) === 0 ? (
        <div className="mb-8 rounded-xl border border-amber-300/40 bg-amber-50/40 p-4 md:p-5">
          <h3 className="mb-2 font-display text-lg font-semibold text-brand-navy">
            Pending chair nominations
          </h3>
          <p className="mb-3 text-xs text-brand-muted">
            Saved by chairs and shared with SMT for review. Final awards appear below after confirmation.
          </p>
          <ul className="space-y-2 text-sm">
            {(myPendingNominations ?? []).map((n) => {
              const category = awardCategoryMeta(n.nomination_type);
              const where = n.committee_conference_id
                ? committeeLabel[n.committee_conference_id] ?? "Committee session"
                : null;
              return (
                <li key={n.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                  <span className="font-medium text-brand-navy">
                    {category?.label ?? n.nomination_type}
                  </span>
                  <span className="text-brand-muted"> · rank {n.rank}</span>
                  {where && <span className="text-brand-muted"> · {where}</span>}
                  {n.evidence_note && (
                    <p className="mt-0.5 text-xs text-brand-muted">{n.evidence_note}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {(myPendingNominations?.length ?? 0) > 0 && (myAwards?.length ?? 0) > 0 ? (
        <ProfileAwardsSummaryTabs
          pendingSlot={
            <div className="rounded-xl border border-amber-300/40 bg-amber-50/40 p-4 md:p-5">
              <h3 className="mb-2 font-display text-lg font-semibold text-brand-navy">
                Pending chair nominations
              </h3>
              <p className="mb-3 text-xs text-brand-muted">
                Saved by chairs and shared with SMT for review. Final awards appear after confirmation.
              </p>
              <ul className="space-y-2 text-sm">
                {(myPendingNominations ?? []).map((n) => {
                  const category = awardCategoryMeta(n.nomination_type);
                  const where = n.committee_conference_id
                    ? committeeLabel[n.committee_conference_id] ?? "Committee session"
                    : null;
                  return (
                    <li key={n.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                      <span className="font-medium text-brand-navy">
                        {category?.label ?? n.nomination_type}
                      </span>
                      <span className="text-brand-muted"> · rank {n.rank}</span>
                      {where && <span className="text-brand-muted"> · {where}</span>}
                      {n.evidence_note && (
                        <p className="mt-0.5 text-xs text-brand-muted">{n.evidence_note}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          }
          recordedSlot={
            <div className="rounded-xl border border-brand-accent/30 bg-brand-cream/50 p-4 md:p-5">
              <h3 className="font-display text-lg font-semibold text-brand-navy mb-2">
                Recorded awards
              </h3>
              <p className="text-xs text-brand-muted mb-3">
                Listed when chairs or SMT assign you in the awards tracker. Final recognition follows your
                conference&apos;s rules.
              </p>
              <ul className="space-y-2 text-sm">
                {(myAwards ?? []).map((a) => {
                  const m = awardCategoryMeta(a.category);
                  const where = a.committee_conference_id
                    ? committeeLabel[a.committee_conference_id] ?? "Committee session"
                    : null;
                  return (
                    <li key={a.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                      <span className="font-medium text-brand-navy">{m?.label ?? a.category}</span>
                      {where && (
                        <span className="text-brand-muted"> · {where}</span>
                      )}
                      {a.notes && (
                        <p className="text-xs text-brand-muted mt-0.5">{a.notes}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          }
        />
      ) : null}
      {isDelegate && (myDelegatePoints?.length ?? 0) > 0 && (
        <div className="mb-8 rounded-xl border border-logo-cyan/35 bg-logo-cyan/10 p-4 md:p-5">
          <h3 className="mb-2 font-display text-lg font-semibold text-brand-navy">
            Chair points (private)
          </h3>
          <p className="mb-3 text-xs text-brand-muted">
            Visible only to you, committee chairs, and SMT for the relevant committee.
          </p>
          <ul className="space-y-2 text-sm">
            {(myDelegatePoints ?? []).map((p) => {
              const where = committeeLabel[p.conference_id] ?? "Committee session";
              const seat = seatById.get(p.allocation_id);
              return (
                <li key={p.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                  <span className="font-medium text-brand-navy">{p.point_text}</span>
                  <span className="text-brand-muted"> · {seat?.country ?? "Delegate"}</span>
                  <span className="text-brand-muted"> · {where}</span>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {new Date(p.created_at).toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {isDelegate && (mySpeechNotes?.length ?? 0) > 0 && (
        <div className="mb-8 rounded-xl border border-brand-silver/35 bg-brand-silver/10 p-4 md:p-5">
          <h3 className="mb-2 font-display text-lg font-semibold text-brand-navy">
            Chair speech notes (private)
          </h3>
          <p className="mb-3 text-xs text-brand-muted">
            Visible only to you, committee chairs, and SMT for the relevant committee.
          </p>
          <ul className="space-y-2 text-sm">
            {(mySpeechNotes ?? []).map((n) => {
              const where = committeeLabel[n.conference_id] ?? "Committee session";
              return (
                <li key={n.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                  <span className="font-medium text-brand-navy">{n.speaker_label || "Speech note"}</span>
                  <span className="text-brand-muted"> · {where}</span>
                  <p className="mt-0.5 text-xs text-brand-muted">{n.content}</p>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {isDelegate && (myMotions?.length ?? 0) > 0 && (
        <div className="mb-8 rounded-xl border border-brand-accent/32 bg-brand-accent/8 p-4 md:p-5">
          <h3 className="mb-2 font-display text-lg font-semibold text-brand-navy">
            Motions you moved
          </h3>
          <p className="mb-3 text-xs text-brand-muted">
            Saved to your profile for committee review and SMT oversight.
          </p>
          <ul className="space-y-2 text-sm">
            {(myMotions ?? []).map((m) => {
              const where = committeeLabel[m.conference_id] ?? "Committee session";
              const title = m.title?.trim() || m.procedure_code?.replace(/_/g, " ") || "Untitled motion";
              return (
                <li key={m.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                  <span className="font-medium text-brand-navy">{title}</span>
                  <span className="text-brand-muted"> · {where}</span>
                  <p className="mt-0.5 text-xs text-brand-muted capitalize">
                    {m.vote_type}
                    {m.procedure_code ? ` · ${m.procedure_code.replace(/_/g, " ")}` : ""}
                  </p>
                  {m.description?.trim() ? (
                    <p className="mt-0.5 text-xs text-brand-muted">{m.description.trim()}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {(myAwards?.length ?? 0) > 0 && (myPendingNominations?.length ?? 0) === 0 ? (
        <div className="mb-8 rounded-xl border border-brand-accent/30 bg-brand-cream/50 p-4 md:p-5">
          <h3 className="font-display text-lg font-semibold text-brand-navy mb-2">
            Recorded awards
          </h3>
          <p className="text-xs text-brand-muted mb-3">
            Listed when chairs or SMT assign you in the awards tracker. Final recognition follows your
            conference&apos;s rules.
          </p>
          <ul className="space-y-2 text-sm">
            {(myAwards ?? []).map((a) => {
              const m = awardCategoryMeta(a.category);
              const where = a.committee_conference_id
                ? committeeLabel[a.committee_conference_id] ?? "Committee session"
                : null;
              return (
                <li key={a.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                  <span className="font-medium text-brand-navy">{m?.label ?? a.category}</span>
                  {where && (
                    <span className="text-brand-muted"> · {where}</span>
                  )}
                  {a.notes && (
                    <p className="text-xs text-brand-muted mt-0.5">{a.notes}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <ProfileForm
        profile={profile}
        userId={user.id}
        canViewPrivate={!!canViewPrivate}
        availableAllocations={availableAllocations}
      />
    </MunPageShell>
  );
}
