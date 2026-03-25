import { createClient } from "@/lib/supabase/server";
import { DocumentsView } from "@/components/documents/DocumentsView";
import { MunPageShell } from "@/components/MunPageShell";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const myRole = (profile?.role || "delegate").toString().toLowerCase();
  const canViewAll = myRole === "chair" || myRole === "smt" || myRole === "admin";
  const canEditAll = myRole === "smt" || myRole === "admin";

  let q = supabase.from("documents").select("*").order("updated_at", { ascending: false });
  if (!canViewAll) q = q.eq("user_id", user.id);
  const { data: docs } = await q;

  return (
    <MunPageShell title="Documents">
      <DocumentsView
        documents={docs || []}
        currentUserId={user.id}
        myRole={myRole}
        canViewAll={canViewAll}
        canEditAll={canEditAll}
      />
    </MunPageShell>
  );
}
