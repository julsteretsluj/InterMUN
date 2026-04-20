import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AllocationPasswordsPage({
  searchParams,
}: {
  searchParams: Promise<{ conference?: string }>;
}) {
  const { conference: conferenceParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role?.toString().toLowerCase();
  if (role === "chair") {
    redirect("/chair");
  }
  if (role === "smt" || role === "admin") {
    const q = conferenceParam ? `?conference=${encodeURIComponent(conferenceParam)}` : "";
    redirect(`/smt/allocation-passwords${q}`);
  }
  {
    redirect("/profile");
  }
}
