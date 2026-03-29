import { createClient } from "@/lib/supabase/server";
import { SourcesView } from "@/components/sources/SourcesView";
import { MunPageShell } from "@/components/MunPageShell";

export default async function SourcesPage() {
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
  const canEditAll = myRole === "chair" || myRole === "smt" || myRole === "admin";

  let sourcesQuery = supabase
    .from("sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (!canEditAll) {
    const { data: follows } = await supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", user.id);

    const followedIds = (follows ?? []).map((f) => f.followed_id);
    const ids = [user.id, ...followedIds];
    sourcesQuery = sourcesQuery.in("user_id", ids.length > 0 ? ids : [user.id]);
  }

  const { data: sources } = await sourcesQuery;

  return (
    <MunPageShell title="Sources">
      <SourcesView
        sources={sources || []}
        currentUserId={user.id}
        canEditAll={canEditAll}
      />
    </MunPageShell>
  );
}
