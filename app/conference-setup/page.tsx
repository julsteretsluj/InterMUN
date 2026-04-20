import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandWordmark } from "@/components/BrandWordmark";
import { ConferenceSetupForm } from "./ConferenceSetupForm";

export default async function ConferenceSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextRaw } = await searchParams;
  const nextPath =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/profile";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/conference-setup?next=${encodeURIComponent(nextPath)}`)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "smt" && profile?.role !== "admin") {
    redirect(`/room-gate?next=${encodeURIComponent(nextPath)}&e=create-forbidden`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-brand-cream">
      <div className="relative w-full max-w-lg space-y-8">
        <BrandWordmark />
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10">
          <div className="h-1 w-16 rounded-full bg-brand-accent mx-auto mb-6" aria-hidden />
          <h1 className="font-display text-xl font-semibold text-brand-navy text-center mb-2">
            Set up a conference
          </h1>
          <p className="text-sm text-brand-muted text-center mb-6">
            Secretariat or <strong>website admin</strong>: creates a <strong>conference code</strong>{" "}
            (first gate) and the first <strong>committee code</strong> (second gate). Add more committees
            in Supabase or via your workflow; dais chairs edit committee codes under Chair → Committee code.
          </p>
          <ConferenceSetupForm nextPath={nextPath} />
          <p className="text-center mt-6">
            <Link
              href={`/room-gate?next=${encodeURIComponent(nextPath)}`}
              className="text-sm text-brand-accent hover:underline"
            >
              Back to join committee
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
