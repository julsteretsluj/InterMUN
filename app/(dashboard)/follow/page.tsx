import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { FollowPeopleClient } from "@/components/follow/FollowPeopleClient";

export default async function FollowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <MunPageShell title="Follow">
      <FollowPeopleClient userId={user.id} />
    </MunPageShell>
  );
}

