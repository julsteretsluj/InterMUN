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

  const { data: delegates } = canViewAll
    ? await supabase
        .from("profiles")
        .select("id, name, username, allocation, role")
        .eq("role", "delegate")
        .order("name", { ascending: true })
    : { data: [] as { id: string; name: string | null; username: string | null; allocation: string | null; role: string }[] };

  const { data: chairs } = canViewAll
    ? await supabase
        .from("profiles")
        .select("id, name, username, allocation, role")
        .eq("role", "chair")
        .order("name", { ascending: true })
    : { data: [] as { id: string; name: string | null; username: string | null; allocation: string | null; role: string }[] };

  let q = supabase.from("documents").select("*").order("updated_at", { ascending: false });
  if (!canViewAll) q = q.eq("user_id", user.id);
  const [{ data: docs }, { data: globalDocs }] = await Promise.all([
    q,
    supabase
      .from("documents")
      .select("*")
      .in("doc_type", ["rop", "award_criteria"])
      .order("updated_at", { ascending: false }),
  ]);

  const mergedDocs = [
    ...(docs ?? []),
    ...((globalDocs ?? []).filter((r) => !(docs ?? []).some((d) => d.id === r.id))),
  ];

  return (
    <MunPageShell title="Documents">
      <DocumentsView
        documents={mergedDocs || []}
        currentUserId={user.id}
        canViewAll={canViewAll}
        canEditAll={canEditAll}
        myRole={myRole}
        delegateOptions={(delegates ?? []).map((d) => ({
          id: d.id,
          label:
            d.name?.trim() ||
            d.username?.trim() ||
            d.allocation?.trim() ||
            d.id.slice(0, 8),
        }))}
        chairOptions={(chairs ?? []).map((c) => ({
          id: c.id,
          label:
            c.name?.trim() ||
            c.username?.trim() ||
            c.allocation?.trim() ||
            c.id.slice(0, 8),
        }))}
      />
    </MunPageShell>
  );
}
