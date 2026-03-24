import { createClient } from "@/lib/supabase/server";
import { SourcesView } from "@/components/sources/SourcesView";

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
    <div>
      <h2 className="text-2xl font-bold mb-6">Sources</h2>
      <SourcesView sources={sources || []} />
    </div>
  );
}
