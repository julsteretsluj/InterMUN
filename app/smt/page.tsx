import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { SMT_COMMITTEE_CODE } from "@/lib/join-codes";
import { formatCommitteeCardTitle, resolveCommitteeDisplayTags } from "@/lib/committee-card-display";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";

function difficultyTagClass(level: "Beginner" | "Intermediate" | "Advanced") {
  if (level === "Beginner") {
    return "border-blue-300/80 bg-blue-100 text-blue-900";
  }
  if (level === "Intermediate") {
    return "border-amber-300/80 bg-amber-100 text-amber-950";
  }
  return "border-rose-300/80 bg-rose-100 text-rose-900";
}

function formatTagClass(format: "Traditional" | "Crisis") {
  if (format === "Crisis") {
    return "border-rose-300/80 bg-rose-100 text-rose-900";
  }
  return "border-sky-300/80 bg-sky-100 text-sky-900";
}

function difficultySortRank(level: "Beginner" | "Intermediate" | "Advanced" | null | undefined) {
  if (level === "Beginner") return 0;
  if (level === "Intermediate") return 1;
  if (level === "Advanced") return 2;
  return 99;
}

export default async function SmtOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e: overviewErr } = await searchParams;
  const supabase = await createClient();
  const eventId = await getActiveEventId();

  if (!eventId) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-center text-brand-muted">
        <p className="mb-4">No conference is selected. Enter your event code first.</p>
        <Link
          href="/event-gate?next=%2Fsmt"
          className="inline-block px-4 py-2 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft"
        >
          Enter conference code
        </Link>
      </div>
    );
  }

  const { data: committees } = await supabase
    .from("conferences")
    .select(
      "id, name, committee, tagline, committee_code, committee_full_name, chair_names, committee_logo_url, created_at"
    )
    .eq("event_id", eventId)
    .order("committee", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const rows = (committees ?? []).filter((c) => {
    const code = c.committee_code?.trim().toUpperCase() ?? "";
    const committeeLabel = c.committee?.trim() ?? "";
    const fullName = c.committee_full_name?.trim() ?? "";
    const hasRealCommitteeLabel =
      committeeLabel.length > 0 &&
      committeeLabel.toLowerCase() !== "committee" &&
      fullName.toLowerCase() !== "committee";
    return code !== SMT_COMMITTEE_CODE && hasRealCommitteeLabel;
  });

  type Row = (typeof rows)[number];

  const groups = new Map<
    string,
    { latestId: string; latestRow: Row; topicCount: number; topics: string[] }
  >();

  for (const r of rows) {
    const groupLabel = formatCommitteeCardTitle(r.committee_full_name, r.committee).trim();
    if (!groupLabel || groupLabel.toLowerCase() === "committee") continue;
    const key = groupLabel.toLowerCase();

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        latestId: r.id,
        latestRow: r,
        topicCount: 1,
        topics: r.name?.trim() ? [r.name.trim()] : [],
      });
      continue;
    }

    const existingTime = existing.latestRow.created_at
      ? new Date(existing.latestRow.created_at).getTime()
      : 0;
    const nextTime = r.created_at ? new Date(r.created_at).getTime() : 0;
    const latestRow = nextTime > existingTime ? r : existing.latestRow;

    groups.set(key, {
      ...existing,
      latestId: latestRow.id,
      latestRow,
      topicCount: existing.topicCount + 1,
      topics:
        r.name?.trim() && !existing.topics.includes(r.name.trim())
          ? [...existing.topics, r.name.trim()]
          : existing.topics,
    });
  }

  const list = Array.from(groups.values()).sort((a, b) => {
    const aDifficulty = resolveCommitteeDisplayTags(a.latestRow.committee)?.difficulty;
    const bDifficulty = resolveCommitteeDisplayTags(b.latestRow.committee)?.difficulty;
    const difficultyDelta = difficultySortRank(aDifficulty) - difficultySortRank(bDifficulty);
    if (difficultyDelta !== 0) return difficultyDelta;

    const aTitle = formatCommitteeCardTitle(
      a.latestRow.committee_full_name,
      a.latestRow.committee
    ).toLowerCase();
    const bTitle = formatCommitteeCardTitle(
      b.latestRow.committee_full_name,
      b.latestRow.committee
    ).toLowerCase();
    return aTitle.localeCompare(bTitle);
  });

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-brand-muted text-sm">
        No committees found for this event. Add them in{" "}
        <Link href="/smt/conference" className="text-brand-accent font-medium hover:underline">
          Event & committee sessions
        </Link>{" "}
        or in Supabase.
      </div>
    );
  }

  return (
    <div>
      {overviewErr === "smt-no-session-floor" && (
        <div
          className="mb-6 rounded-lg border border-brand-accent/40 bg-brand-cream/60 px-4 py-3 text-sm text-brand-navy"
          role="status"
        >
          <strong>Session floor</strong> (timers, speakers, roll call) is for <strong>dais chairs</strong>{" "}
          only. Use <strong>Live committees</strong> below for oversight, or enter committee codes like
          delegates when you need a specific session.
        </div>
      )}
      <h1 className="font-display text-3xl font-semibold text-brand-navy mb-2">
        Welcome Secretary General!
      </h1>
      <p className="text-base text-brand-navy mb-6">Which committee would you like to check in on?</p>
      <div className="mb-6">
        <RoleSetupChecklist role="smt" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((g) => (
          <Link
            key={g.latestId}
            href={`/smt/committees/${g.latestId}`}
            className="rounded-xl border border-brand-navy/15 bg-brand-paper px-4 py-3 text-brand-navy shadow-sm hover:bg-brand-cream transition-colors"
          >
            {g.latestRow.committee_logo_url ? (
              <img
                src={g.latestRow.committee_logo_url}
                alt={`${g.latestRow.committee ?? "Committee"} logo`}
                className="h-10 w-10 object-contain rounded-md bg-white/60 border border-brand-navy/10 mb-2"
              />
            ) : null}
            <p className="font-semibold text-sm leading-snug">
              {formatCommitteeCardTitle(g.latestRow.committee_full_name, g.latestRow.committee)}
            </p>
            {(() => {
              const tags = resolveCommitteeDisplayTags(g.latestRow.committee);
              if (!tags) return null;
              return (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${difficultyTagClass(tags.difficulty)}`}
                  >
                    {tags.difficulty}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${formatTagClass(tags.format)}`}
                  >
                    {tags.format}
                  </span>
                  <span className="rounded-full border border-brand-silver/60 bg-brand-silver/15 px-2 py-0.5 text-[0.68rem] font-semibold text-brand-navy">
                    {tags.ageRange}
                  </span>
                  {tags.eslFriendly ? (
                    <span className="rounded-full border border-sky-300/80 bg-sky-100 px-2 py-0.5 text-[0.68rem] font-semibold text-sky-900">
                      ESL-friendly
                    </span>
                  ) : null}
                </div>
              );
            })()}
            {g.latestRow.chair_names?.trim() ? (
              <p className="text-xs text-brand-muted mt-2">
                <span className="font-medium text-brand-navy/80">Chairs: </span>
                {g.latestRow.chair_names.trim()}
              </p>
            ) : null}
            {g.latestRow.committee_code?.trim() ? (
              <p className="text-xs font-mono text-brand-navy/70 mt-2 tracking-widest">
                {g.latestRow.committee_code.trim().toUpperCase()}
              </p>
            ) : null}
            {g.topicCount > 1 ? (
              <p className="text-[0.72rem] text-brand-navy/85 mt-1 font-medium">{g.topicCount} sessions</p>
            ) : null}
            {g.topics.length > 0 ? (
              <div className="mt-2 space-y-1">
                {g.topics.slice(0, 2).map((topic) => (
                  <p key={topic} className="text-[0.72rem] text-brand-navy/90 leading-snug">
                    <span className="font-semibold text-brand-navy">Topic:</span> {topic}
                  </p>
                ))}
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
