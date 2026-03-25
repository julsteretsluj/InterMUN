import { createClient } from "@/lib/supabase/server";
import { GuidesView } from "@/components/guides/GuidesView";
import { MunPageShell } from "@/components/MunPageShell";

export default async function GuidesPage() {
  const supabase = await createClient();
  const { data: guides } = await supabase
    .from("guides")
    .select("*")
    .order("slug");

  return (
    <MunPageShell title="Guides">
      <GuidesView guides={guides || []} />
    </MunPageShell>
  );
}
