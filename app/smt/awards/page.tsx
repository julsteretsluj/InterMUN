import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { AwardsManagerClient } from "@/app/(dashboard)/chair/awards/AwardsManagerClient";
import type { AwardAssignment } from "@/types/database";
import { isSmtRole } from "@/lib/roles";

export default async function SmtAwardsPage() {
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

  if (!isSmtRole(profile?.role)) {
    redirect("/profile");
  }

  const [{ data: conferences }, { data: assignments }, { data: profiles }] = await Promise.all([
    supabase.from("conferences").select("id, name, committee").order("created_at", { ascending: false }),
    supabase.from("award_assignments").select("*").order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, name").order("name").limit(500),
  ]);

  return (
    <MunPageShell title="Awards">
      <AwardsManagerClient
        conferences={conferences ?? []}
        assignments={(assignments ?? []) as AwardAssignment[]}
        profiles={profiles ?? []}
      />
    </MunPageShell>
  );
}
