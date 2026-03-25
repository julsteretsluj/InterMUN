import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FollowPeopleClient } from "@/components/follow/FollowPeopleClient";

export default async function SmtFollowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <FollowPeopleClient userId={user.id} />;
}

