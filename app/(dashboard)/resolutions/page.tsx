import { createClient } from "@/lib/supabase/server";
import { ResolutionsView } from "@/components/resolutions/ResolutionsView";

export default async function ResolutionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: resolutions } = await supabase
    .from("resolutions")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: blocs } = await supabase
    .from("blocs")
    .select("*, bloc_memberships(*)");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Resolutions</h2>
      <ResolutionsView resolutions={resolutions || []} blocs={blocs || []} />
    </div>
  );
}
