import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { FollowPeopleClient } from "@/components/follow/FollowPeopleClient";
import { redirect } from "next/navigation";

export default async function FollowPage() {
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
  if (myRole === "smt" || myRole === "admin") {
    redirect("/smt/follow");
  }

  return (
    <MunPageShell title="Follow">
      <FollowPeopleClient userId={user.id} />
    </MunPageShell>
  );
}

