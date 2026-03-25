import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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

  const roleLower = profile?.role?.toString().trim().toLowerCase();
  if (roleLower === "smt") {
    redirect("/smt");
  }
  if (roleLower === "admin") {
    redirect("/admin");
  }

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

  if (profile?.role?.toString().trim().toLowerCase() === "delegate") {
    const delegateOf = profile?.country || profile?.name || "your committee";
    const quickActions = [
      { href: "/documents", label: "Documents" },
      { href: "/chats-notes", label: "Notes" },
      { href: "/ideas", label: "Ideas" },
      { href: "/guides", label: "Guides" },
      { href: "/sources", label: "Sources" },
      { href: "/report", label: "Report" },
      { href: "/voting", label: "Motions" },
      { href: "/voting", label: "Points" },
    ];

    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-10 shadow-sm">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-brand-navy">
            Welcome delegate of {delegateOf}
          </h2>
          <p className="mt-3 text-brand-muted">What would you like to start with?</p>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {quickActions.map((item) => (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                className="rounded-lg border border-brand-navy/20 px-3 py-2 text-sm font-medium text-brand-navy bg-white hover:bg-brand-cream transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <MunPageShell title="Profile">
      {(myAwards?.length ?? 0) > 0 && (
        <div className="mb-8 rounded-xl border border-brand-gold/30 bg-brand-cream/50 p-4 md:p-5">
          <h3 className="font-display text-lg font-semibold text-brand-navy mb-2">
            Recorded awards
          </h3>
          <p className="text-xs text-brand-muted mb-3">
            Listed when chairs or SMT assign you in the awards tracker. Final recognition follows your
            conference&apos;s rules.
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
