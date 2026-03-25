import { createClient } from "@/lib/supabase/server";
import { ResolutionsView } from "@/components/resolutions/ResolutionsView";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";

export default async function ResolutionsPage() {
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
  const canCreate = myRole === "chair" || myRole === "smt" || myRole === "admin";

  const conferenceId = await requireActiveConferenceId();

  const { data: resolutions } = await supabase
    .from("resolutions")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: false });

  const resList = resolutions ?? [];
  const resIds = resList.map((r) => r.id);
  const { data: blocs } =
    resIds.length > 0
      ? await supabase
          .from("blocs")
          .select("*, bloc_memberships(*)")
          .in("resolution_id", resIds)
      : { data: [] };

  return (
    <MunPageShell title="Resolutions">
      <ResolutionsView
        resolutions={resolutions || []}
        blocs={blocs || []}
        conferenceId={conferenceId}
        canCreate={canCreate}
      />
    </MunPageShell>
  );
}
