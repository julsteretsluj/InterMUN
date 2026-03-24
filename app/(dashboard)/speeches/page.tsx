import { createClient } from "@/lib/supabase/server";
import { SpeechesView } from "@/components/speeches/SpeechesView";

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
    <div>
      <h2 className="text-2xl font-bold mb-6">Speeches</h2>
      <SpeechesView speeches={speeches || []} />
    </div>
  );
}
