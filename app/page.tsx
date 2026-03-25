import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole, isSmtRole, SMT_APP_HOME, ADMIN_APP_HOME } from "@/lib/roles";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (isAdminRole(profile?.role)) redirect(ADMIN_APP_HOME);
    redirect(isSmtRole(profile?.role) ? SMT_APP_HOME : "/profile");
  }
  redirect("/login");
}
