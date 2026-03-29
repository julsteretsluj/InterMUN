import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { OfficialLinksPanel } from "@/components/OfficialLinksPanel";

export default async function OfficialLinksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <MunPageShell title="Official UN links">
      <OfficialLinksPanel />
    </MunPageShell>
  );
}
