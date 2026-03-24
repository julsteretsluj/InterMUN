import { createClient } from "@/lib/supabase/server";
import { GuidesView } from "@/components/guides/GuidesView";

export default async function GuidesPage() {
  const supabase = await createClient();
  const { data: guides } = await supabase
    .from("guides")
    .select("*")
    .order("slug");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Guides</h2>
      <GuidesView guides={guides || []} />
    </div>
  );
}
