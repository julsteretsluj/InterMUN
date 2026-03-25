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

  if (profile?.role !== "chair" && profile?.role !== "smt") {
    redirect(`/room-gate?next=${encodeURIComponent(nextPath)}&e=create-forbidden`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-b from-brand-cream via-brand-paper to-[#e4ddd4]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(184,148,30,0.08),transparent)] pointer-events-none" />
      <div className="relative w-full max-w-lg space-y-8">
        <BrandWordmark />
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10">
          <div className="h-1 w-16 rounded-full bg-brand-gold mx-auto mb-6" aria-hidden />
          <h1 className="font-display text-xl font-semibold text-brand-navy text-center mb-2">
            Set up a conference
          </h1>
          <p className="text-sm text-brand-muted text-center mb-6">
            Creates a <strong>conference code</strong> (first gate for all delegates) and your first{" "}
            <strong>committee code</strong> (second gate). Add more committees later in Supabase or
            future tools; chairs can edit committee codes from Chair → Set committee code.
          </p>
          <ConferenceSetupForm nextPath={nextPath} />
          <p className="text-center mt-6">
            <Link
              href={`/room-gate?next=${encodeURIComponent(nextPath)}`}
              className="text-sm text-brand-gold hover:underline"
            >
              Back to join committee
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
