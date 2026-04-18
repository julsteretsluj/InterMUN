import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Flag, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { loadCommitteeRoomPayload } from "@/lib/committee-room-payload";
import { isCrisisCommittee } from "@/lib/crisis-committee";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function dash(v: string | null | undefined) {
  const t = v?.trim();
  return t ? t : "—";
}

function initialsFrom(label: string): string {
  const parts = label
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-brand-navy">{value}</dd>
    </div>
  );
}

export default async function CommitteeRoomPersonPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  if (!UUID_RE.test(profileId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const conferenceId = await requireActiveConferenceId();

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle();

  const viewerRole = (viewerProfile?.role ?? "delegate").toString().toLowerCase();

  const payload = await loadCommitteeRoomPayload(supabase, conferenceId, {
    includeDelegatesForStaff: false,
  });
  const crisisReportingEnabled = isCrisisCommittee(payload.conference?.committee ?? null);

  const allowed = new Set<string>();
  for (const p of payload.placards) {
    if (p.profileId) allowed.add(p.profileId);
  }
  for (const s of payload.dais) {
    if (s.profileId) allowed.add(s.profileId);
  }

  if (!allowed.has(profileId)) notFound();

  const placard = payload.placards.find((p) => p.profileId === profileId) ?? null;
  const daisSeat = payload.dais.find((s) => s.profileId === profileId) ?? null;

  const canReadFullProfile =
    viewerRole === "chair" || viewerRole === "smt" || viewerRole === "admin" || user.id === profileId;

  const { data: fullProfile } = canReadFullProfile
    ? await supabase
        .from("profiles")
        .select("name, pronouns, school, role")
        .eq("id", profileId)
        .maybeSingle()
    : { data: null };

  const displayLabel =
    (fullProfile?.name?.trim() && fullProfile.name) ||
    (placard && (placard.name?.trim() || placard.country)) ||
    (daisSeat && `${daisSeat.title}: ${daisSeat.name ?? "—"}`) ||
    "Member";

  const subtitle =
    (placard && [placard.country, placard.name].filter(Boolean).join(" · ")) ||
    (daisSeat && `${daisSeat.title}`) ||
    "Committee member";

  const reportAboutName = encodeURIComponent(displayLabel);
  const initials = initialsFrom(displayLabel);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/committee-room"
          className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-navy transition-colors w-fit"
        >
          <ChevronLeft className="size-4 shrink-0" strokeWidth={2} />
          Committee room
        </Link>
        <div className="flex items-center gap-2 sm:justify-end">
          <Link
            href={`/chats-notes?forProfile=${encodeURIComponent(profileId)}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-400/35 bg-gradient-to-br from-blue-500/25 to-blue-600/10 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 shadow-sm hover:opacity-95"
          >
            <MessageCircle className="size-4 shrink-0" strokeWidth={2} />
            Chat
          </Link>
          {crisisReportingEnabled ? (
            <Link
              href={`/report?about=${encodeURIComponent(profileId)}&aboutName=${reportAboutName}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-400/30 bg-gradient-to-br from-rose-500/20 to-rose-600/5 px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:border-rose-400/50"
            >
              <Flag className="size-4 shrink-0" strokeWidth={2} />
              Report
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] items-start">
        {/* Profile rail — mockup left sidebar */}
        <aside className="rounded-2xl border border-brand-accent/20 bg-brand-paper/90 p-6 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div
                className="flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg ring-4 ring-white/10"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(251,146,60,0.85) 0%, rgba(217,70,239,0.55) 48%, rgba(16,185,129,0.75) 100%)",
                }}
                aria-hidden
              >
                {initials}
              </div>
              <span
                className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-brand-accent-bright border-[3px] border-[rgba(18,18,18,0.95)] shadow-sm"
                title="In committee"
                aria-hidden
              />
            </div>
            <h1 className="mt-5 font-display text-xl font-semibold text-brand-navy leading-tight px-1">
              {displayLabel}
            </h1>
            <p className="mt-1.5 text-sm text-brand-muted max-w-[16rem]">{subtitle}</p>
          </div>

          <div className="mt-6 pt-6 border-t border-brand-line/40 space-y-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-muted text-center">
              Profile &amp; actions
            </p>
            <div
              className={crisisReportingEnabled ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}
            >
              <Link
                href={`/chats-notes?forProfile=${encodeURIComponent(profileId)}`}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 py-3 text-xs font-semibold text-brand-navy hover:border-blue-400/30 transition-colors"
              >
                <MessageCircle className="size-5 text-blue-400/90" strokeWidth={1.75} />
                Messages
              </Link>
              {crisisReportingEnabled ? (
                <Link
                  href={`/report?about=${encodeURIComponent(profileId)}&aboutName=${reportAboutName}`}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 py-3 text-xs font-semibold text-brand-navy hover:border-rose-400/35 transition-colors"
                >
                  <Flag className="size-5 text-rose-400/90" strokeWidth={1.75} />
                  Report
                </Link>
              ) : null}
            </div>
          </div>
        </aside>

        {/* Detail cards — mockup main list / panels */}
        <div className="space-y-4 min-w-0">
          {placard ? (
            <section className="rounded-2xl border border-brand-accent/15 bg-gradient-to-br from-brand-accent/[0.12] via-brand-paper/50 to-brand-silver/[0.1] p-5 md:p-6 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)]">
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-muted mb-4">
                Delegation placard
              </h2>
              <dl className="grid gap-2 sm:grid-cols-2">
                <InfoRow label="Country" value={placard.country} />
                <InfoRow label="Name" value={dash(placard.name)} />
                <InfoRow label="School" value={dash(placard.school)} />
                <InfoRow label="Pronouns" value={dash(placard.pronouns)} />
              </dl>
            </section>
          ) : null}

          {daisSeat ? (
            <section className="rounded-2xl border border-brand-silver/25 bg-gradient-to-br from-brand-silver/[0.12] via-brand-paper/50 to-brand-accent/[0.08] p-5 md:p-6 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)]">
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-muted mb-4">Dais</h2>
              <dl className="grid gap-2 sm:grid-cols-2">
                <InfoRow label="Role" value={daisSeat.title} />
                <InfoRow label="Name" value={dash(daisSeat.name)} />
              </dl>
            </section>
          ) : null}

          {canReadFullProfile && fullProfile ? (
            <section className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/[0.1] via-brand-paper/50 to-blue-500/[0.08] p-5 md:p-6 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)]">
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-muted mb-4">
                Account profile
              </h2>
              <dl className="grid gap-2 sm:grid-cols-2">
                <InfoRow label="Account name" value={dash(fullProfile.name)} />
                <InfoRow label="Role" value={dash(fullProfile.role)} />
                <InfoRow label="Pronouns" value={dash(fullProfile.pronouns)} />
                <InfoRow label="School" value={dash(fullProfile.school)} />
              </dl>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
