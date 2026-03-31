import Link from "next/link";

type RoleKey = "admin" | "smt" | "chair" | "delegate";

type Step = {
  label: string;
  href: string;
  detail: string;
};

function stepsForRole(role: RoleKey): { title: string; subtitle: string; steps: Step[] } {
  if (role === "admin") {
    return {
      title: "Admin setup checklist",
      subtitle: "Website-level setup and staff provisioning.",
      steps: [
        { label: "Create event + first committee", href: "/conference-setup?next=%2Fadmin", detail: "Generate conference + committee gates." },
        { label: "Invite or promote SMT accounts", href: "/admin", detail: "Grant secretariat access before committee operations." },
        { label: "Verify status portal pipeline", href: "/admin", detail: "Monitor pending -> confirmed delegate flow." },
        { label: "Hand off to SMT dashboard", href: "/smt", detail: "Live committee operations continue in SMT tools." },
      ],
    };
  }
  if (role === "smt") {
    return {
      title: "SMT setup checklist",
      subtitle: "Conference-wide controls before chairs and delegates enter.",
      steps: [
        { label: "Confirm event + committee sessions", href: "/smt/conference", detail: "Validate names, tags, chair names, and crisis links." },
        { label: "Set room codes + chair access", href: "/smt/room-codes", detail: "Ensure each committee has correct gate codes." },
        { label: "Prepare allocations + sign-in docs", href: "/smt/allocation-matrix", detail: "Import seats, then set passwords/codes." },
        { label: "Publish global docs (RoP / criteria)", href: "/documents", detail: "Upload common references for all users." },
      ],
    };
  }
  if (role === "chair") {
    return {
      title: "Chair setup checklist",
      subtitle: "Room-readiness and floor controls for your committee.",
      steps: [
        { label: "Check delegate matrix + approvals", href: "/chair/allocation-matrix", detail: "Confirm assignments and pending sign-up reviews." },
        { label: "Run roll call approvals", href: "/chair/session/roll-call", detail: "Mark delegates present before floor participation." },
        { label: "Set timer + speaker flow", href: "/chair/session/timer", detail: "Save floor presets before opening motions." },
        { label: "Open digital room operations", href: "/chair/digital-room", detail: "Coordinate speakers, notes, and session visibility." },
      ],
    };
  }
  return {
    title: "Delegate setup checklist",
    subtitle: "Get ready to participate in committee quickly.",
    steps: [
      { label: "Complete profile basics", href: "/profile", detail: "Verify your name, allocation, and account details." },
      { label: "Read RoP + award criteria", href: "/documents", detail: "Open shared docs uploaded by SMT." },
      { label: "Create your prep document", href: "/documents", detail: "Upload/edit prep notes directly in-app." },
      { label: "Join committee room + roll call", href: "/committee-room", detail: "Wait for chair present-status approval, then speak." },
    ],
  };
}

export function RoleSetupChecklist({ role }: { role: RoleKey }) {
  const cfg = stepsForRole(role);

  return (
    <section className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
      <h2 className="font-display text-lg font-semibold text-brand-navy">{cfg.title}</h2>
      <p className="mt-1 text-sm text-brand-muted">{cfg.subtitle}</p>
      <ol className="mt-4 space-y-2">
        {cfg.steps.map((step, i) => (
          <li key={`${step.href}-${step.label}`} className="rounded-lg border border-brand-navy/10 bg-black/10 px-3 py-2">
            <p className="text-sm font-medium text-brand-navy">
              {i + 1}.{" "}
              <Link href={step.href} className="text-brand-gold hover:underline">
                {step.label}
              </Link>
            </p>
            <p className="mt-0.5 text-xs text-brand-muted">{step.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

