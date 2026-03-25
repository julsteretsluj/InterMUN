import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { MunPageShell } from "@/components/MunPageShell";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const canViewPrivate = true;

  return (
    <MunPageShell title="Profile">
      <ProfileForm
        profile={profile}
        userId={user.id}
        canViewPrivate={!!canViewPrivate}
      />
    </MunPageShell>
  );
}
