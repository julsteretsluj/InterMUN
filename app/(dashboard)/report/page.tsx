import { createClient } from "@/lib/supabase/server";
import { ReportView } from "@/components/report/ReportView";
import { MunPageShell } from "@/components/MunPageShell";
import { redirect } from "next/navigation";

export default async function ReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.role) redirect("/login");

  const myRole = profile.role.toString().toLowerCase();
  const canViewAll = myRole === "chair" || myRole === "smt" || myRole === "admin";

  let q = supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (!canViewAll) q = q.eq("user_id", user.id);
  const { data: reports } = await q;

  return (
    <MunPageShell title="Report">
      <ReportView reports={reports || []} canViewAll={canViewAll} />
    </MunPageShell>
  );
}
