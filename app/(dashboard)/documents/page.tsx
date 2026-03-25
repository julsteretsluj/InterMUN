import { createClient } from "@/lib/supabase/server";
import { DocumentsView } from "@/components/documents/DocumentsView";
import { MunPageShell } from "@/components/MunPageShell";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: docs } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <MunPageShell title="Documents">
      <DocumentsView documents={docs || []} />
    </MunPageShell>
  );
}
