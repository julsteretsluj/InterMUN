import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { RoomCodeChairForm } from "./RoomCodeChairForm";

export default async function ChairRoomCodePage() {
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

  if (profile?.role !== "chair" && profile?.role !== "smt") {
    redirect("/profile");
  }

  const { data: conferences } = await supabase
    .from("conferences")
    .select("id, name, committee, room_code")
    .order("created_at", { ascending: false });

  return (
    <MunPageShell title="Room codes (chair / SMT)">
      <p className="text-sm text-brand-muted mb-6 max-w-xl">
        Set a short <strong>room code</strong> for each committee. Delegates enter it after login to
        load the correct session. Codes are unique across the project. After saving, you can go
        straight into that committee or share the code on the dais.
      </p>
      <RoomCodeChairForm conferences={conferences ?? []} />
    </MunPageShell>
  );
}
