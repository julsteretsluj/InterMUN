import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SmtFollowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  redirect("/smt");
}

