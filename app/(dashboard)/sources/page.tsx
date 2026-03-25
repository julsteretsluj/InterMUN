import { createClient } from "@/lib/supabase/server";
import { SourcesView } from "@/components/sources/SourcesView";
import { MunPageShell } from "@/components/MunPageShell";

export default async function SourcesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <MunPageShell title="Sources">
      <SourcesView sources={sources || []} />
    </MunPageShell>
  );
}
