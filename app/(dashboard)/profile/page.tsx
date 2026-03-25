import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { MunPageShell } from "@/components/MunPageShell";
import { awardCategoryMeta } from "@/lib/awards";

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

  const { data: myAwards } = await supabase
    .from("award_assignments")
    .select("*")
    .eq("recipient_profile_id", user.id)
    .order("created_at", { ascending: true });

  const committeeIds = [
    ...new Set(
      (myAwards ?? [])
        .map((a) => a.committee_conference_id)
        .filter((id): id is string => Boolean(id))
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

  const canViewPrivate = true;

  return (
    <MunPageShell title="Profile">
      {(myAwards?.length ?? 0) > 0 && (
        <div className="mb-8 rounded-xl border border-brand-gold/30 bg-brand-cream/50 p-4 md:p-5">
          <h3 className="font-display text-lg font-semibold text-brand-navy mb-2">
            SEAMUN I — recorded awards
          </h3>
          <p className="text-xs text-brand-muted mb-3">
            Listed when chairs or SMT assign you in the awards tracker. Final recognition follows
            the conference handbook.
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
      )}
      <ProfileForm
        profile={profile}
        userId={user.id}
        canViewPrivate={!!canViewPrivate}
      />
    </MunPageShell>
  );
}
