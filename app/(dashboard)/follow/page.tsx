import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { FollowPeopleClient } from "@/components/follow/FollowPeopleClient";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function FollowPage() {
  const t = await getTranslations("pageTitles");
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
    <MunPageShell title={t("follow")}>
      <FollowPeopleClient userId={user.id} />
    </MunPageShell>
  );
}

