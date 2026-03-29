import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { DelegateCountdownCard } from "@/components/delegate/DelegateCountdownCard";

export default async function DelegateDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conferenceId = await requireActiveConferenceId();
  const { data: conf } = await supabase
    .from("conferences")
    .select("committee, tagline, name")
    .eq("id", conferenceId)
    .maybeSingle();
  const line = [conf?.committee, conf?.tagline].filter(Boolean).join(" · ") || conf?.name || "Committee";

  const tiles: { href: string; label: string; hint: string; emoji: string }[] = [
    { href: "/stances", label: "Country & stance", hint: "Your position and prep", emoji: "🌍" },
    { href: "/delegate#countdown", label: "Countdown", hint: "Conference & paper deadlines (this device)", emoji: "⏱️" },
    { href: "/committee-room", label: "Committee matrix", hint: "Seats and committee room", emoji: "📊" },
    { href: "/speeches", label: "Prep & speeches", hint: "Speech drafts and floor prep", emoji: "📝" },
    { href: "/sources", label: "Trusted sources", hint: "Research links and nation sources", emoji: "🔗" },
    { href: "/guides", label: "Guides & resources", hint: "How-to and chair-facing references", emoji: "📚" },
    { href: "/running-notes", label: "Checklist & running notes", hint: "Session scratch pad", emoji: "✅" },
    { href: "/official-links", label: "Official UN links", hint: "Documents, bodies, programmes", emoji: "🌐" },
    { href: "/voting", label: "Voting", hint: "When your chair opens a vote", emoji: "🗳️" },
    { href: "/documents", label: "Archive", hint: "Your documents", emoji: "📁" },
    { href: "/report", label: "Crisis / report", hint: "Raise an issue", emoji: "⚠️" },
  ];

  return (
    <MunPageShell title="Delegate dashboard">
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="text-lg font-medium text-slate-800 dark:text-zinc-100">
            🌍 Country · 📊 Matrix · 📝 Prep · ✅ Checklist · ⏱️ Countdown
          </p>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Active committee: <span className="font-semibold text-slate-900 dark:text-zinc-100">{line}</span>.
            Conference dates below are stored in this browser only. Everything else follows your InterMUN account
            and committee assignment.
          </p>
        </header>

        <DelegateCountdownCard conferenceId={conferenceId} />

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Jump to
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {tiles.map((t) => (
              <li key={t.href + t.label}>
                <Link
                  href={t.href}
                  className="block rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm transition hover:border-violet-300 hover:bg-violet-50/40 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-violet-500/40 dark:hover:bg-violet-950/30"
                >
                  <span className="font-semibold text-slate-900 dark:text-zinc-50">
                    <span className="mr-1.5" aria-hidden>
                      {t.emoji}
                    </span>
                    {t.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-zinc-400">{t.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </MunPageShell>
  );
}
