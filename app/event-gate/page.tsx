import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandWordmark } from "@/components/BrandWordmark";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { EventGateForm } from "./EventGateForm";
import { AutoJoinSingleton } from "../room-gate/AutoJoinSingleton";

export default async function EventGatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextRaw } = await searchParams;
  const finalNext =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/profile";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/event-gate?next=${encodeURIComponent(finalNext)}`)}`);
  }

  const { count: eventCount } = await supabase
    .from("conference_events")
    .select("*", { count: "exact", head: true });
  const { count: confCount } = await supabase
    .from("conferences")
    .select("*", { count: "exact", head: true });

  if ((eventCount ?? 0) === 1 && (confCount ?? 0) === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-brand-cream">
        <div className="relative w-full max-w-md space-y-8">
          <BrandWordmark />
          <AutoJoinSingleton nextPath={finalNext} />
        </div>
      </div>
    );
  }

  const eventId = await getActiveEventId();
  if (eventId) {
    const { data: exists } = await supabase
      .from("conference_events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();
    if (exists) {
      redirect(`/room-gate?next=${encodeURIComponent(finalNext)}`);
    }
  }

  const roomGateNext = `/room-gate?next=${encodeURIComponent(finalNext)}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-brand-cream">
      <div className="relative w-full max-w-md space-y-8">
        <BrandWordmark />
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10">
          <div className="h-1 w-16 rounded-full bg-brand-accent mx-auto mb-6" aria-hidden />
          <h1 className="font-display text-xl font-semibold text-brand-navy text-center mb-2">
            Join your conference
          </h1>
          <p className="text-sm text-brand-muted text-center mb-6">
            Enter the <strong>conference code</strong> from your organisers. On the next screen you will
            enter your <strong>committee code</strong> for your specific session.
          </p>
          <EventGateForm roomGateNext={roomGateNext} />
          <p className="text-center mt-6">
            <Link href={`/room-gate?next=${encodeURIComponent(finalNext)}`} className="text-sm text-brand-accent hover:underline">
              Already entered the conference code? Committee step →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
