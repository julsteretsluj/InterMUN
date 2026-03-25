import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { getResolvedActiveConference } from "@/lib/active-conference";
import { SessionControlClient } from "./SessionControlClient";

export default async function ChairSessionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "chair") {
    if (profile?.role === "smt") {
      redirect("/smt?e=smt-no-session-floor");
    }
    if (profile?.role === "admin") {
      redirect("/admin?e=no-session-floor");
    }
    redirect("/profile");
  }

  const active = await getResolvedActiveConference();

  if (!active) {
    return (
      <MunPageShell title="Session floor">
        <p className="text-sm text-brand-muted mb-4 max-w-lg">
          Join a committee with your room code first (or set a code and enter), then return here to
          run timers, the speakers list, roll call, and dais notes for that session.
        </p>
        <Link
          href="/chair/room-code"
          className="inline-block text-brand-gold font-medium hover:underline"
        >
          Go to room codes
        </Link>
      </MunPageShell>
    );
  }

  const title = [active.name, active.committee].filter(Boolean).join(" — ");

  return (
    <MunPageShell title="Session floor">
      <SessionControlClient conferenceId={active.id} conferenceTitle={title} />
    </MunPageShell>
  );
}
