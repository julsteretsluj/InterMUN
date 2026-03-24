import { createClient } from "@/lib/supabase/server";
import { ReportView } from "@/components/report/ReportView";

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
    <div>
      <h2 className="text-2xl font-bold mb-6">Report</h2>
      <ReportView reports={reports || []} />
    </div>
  );
}
