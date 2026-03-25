import { createClient } from "@/lib/supabase/server";
import { SpeechesView } from "@/components/speeches/SpeechesView";
import { MunPageShell } from "@/components/MunPageShell";

export default async function SpeechesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: speeches } = await supabase
    .from("speeches")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <MunPageShell title="Speeches">
      <SpeechesView speeches={speeches || []} />
    </MunPageShell>
  );
}
