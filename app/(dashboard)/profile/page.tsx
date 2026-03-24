import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";

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
    <div>
      <h2 className="text-2xl font-bold mb-6">Profile</h2>
      <ProfileForm
        profile={profile}
        userId={user.id}
        canViewPrivate={!!canViewPrivate}
      />
    </div>
  );
}
