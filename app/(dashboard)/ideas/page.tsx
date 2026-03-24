import { createClient } from "@/lib/supabase/server";
import { IdeasView } from "@/components/ideas/IdeasView";

export default async function IdeasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ideas } = await supabase
    .from("ideas")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Ideas</h2>
      <IdeasView ideas={ideas || []} />
    </div>
  );
}
