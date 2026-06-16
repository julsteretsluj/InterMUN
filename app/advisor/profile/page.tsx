import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { MunPageShell } from "@/components/MunPageShell";
import { isAdvisorRole } from "@/lib/roles";
import { getTranslations } from "next-intl/server";

export default async function AdvisorProfilePage() {
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!isAdvisorRole(profile?.role)) redirect("/profile");

  return (
    <MunPageShell title={t("profile")}>
      <ProfileForm
        profile={profile}
        userId={user.id}
        canViewPrivate={false}
        isAdvisorProfile
        availableAllocations={[]}
      />
    </MunPageShell>
  );
}
