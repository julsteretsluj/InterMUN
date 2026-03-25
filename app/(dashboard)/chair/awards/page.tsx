import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { AwardsManagerClient } from "./AwardsManagerClient";
import type { AwardAssignment } from "@/types/database";

export default async function ChairAwardsPage() {
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

  if (profile?.role !== "chair" && profile?.role !== "smt" && profile?.role !== "admin") {
    redirect("/profile");
  }

  const [{ data: conferences }, { data: assignments }, { data: profiles }] = await Promise.all([
    supabase
      .from("conferences")
      .select("id, name, committee")
      .order("created_at", { ascending: false }),
    supabase
      .from("award_assignments")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, name").order("name").limit(500),
  ]);

  return (
    <MunPageShell title="Awards (chair / SMT)">
      <AwardsManagerClient
        conferences={conferences ?? []}
        assignments={(assignments ?? []) as AwardAssignment[]}
        profiles={profiles ?? []}
      />
    </MunPageShell>
  );
}
