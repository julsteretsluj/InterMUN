import Link from "next/link";

const SECTIONS: { href: string; title: string; description: string }[] = [
  {
    href: "/chair/session/motions",
    title: "Motions & voting",
    description: "Motion floor, stated motions, open vote, roll-call recording, and recent motions.",
  },
  {
    href: "/chair/session/timer",
    title: "Timer",
    description: "Floor clock, pause/start, per-speaker mode, and moderated caucus advance.",
  },
  {
    href: "/chair/session/announcements",
    title: "Dais announcements",
    description: "Post messages visible on the committee floor.",
  },
  {
    href: "/chair/session/speakers",
    title: "Speakers queue",
    description: "Speaker list, add allocations, current speaker, and moderated caucus bulk add.",
  },
  {
    href: "/chair/session/roll-call",
    title: "Roll call",
    description: "Initialize presence rows and mark delegations present.",
  },
];

export function SessionFloorOverview({ conferenceTitle }: { conferenceTitle: string }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-brand-muted">{conferenceTitle}</p>
      <p className="max-w-xl text-sm text-brand-muted">
        Session tools are split by topic. Use the committee room for a single combined view, or open a section below.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block rounded-xl border border-white/15 bg-black/25 p-4 shadow-sm transition hover:border-brand-gold/40 hover:bg-black/35"
            >
              <span className="font-display font-semibold text-brand-navy">{s.title}</span>
              <p className="mt-1 text-sm text-brand-muted">{s.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
