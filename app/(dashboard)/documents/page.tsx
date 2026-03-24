import { createClient } from "@/lib/supabase/server";
import { DocumentsView } from "@/components/documents/DocumentsView";

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
    <div>
      <h2 className="text-2xl font-bold mb-6">Documents</h2>
      <DocumentsView documents={docs || []} />
    </div>
  );
}
