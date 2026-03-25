import { createClient } from "@/lib/supabase/server";
import { ReportView } from "@/components/report/ReportView";
import { MunPageShell } from "@/components/MunPageShell";

export default async function ReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <MunPageShell title="Report">
      <ReportView reports={reports || []} />
    </MunPageShell>
  );
}
