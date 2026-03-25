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

  if (profile?.role !== "chair" && profile?.role !== "smt" && profile?.role !== "admin") {
    redirect("/profile");
  }

  const { data: conferences } = await supabase
    .from("conferences")
    .select("id, name, committee, room_code, committee_code")
    .order("created_at", { ascending: false });

  return (
    <MunPageShell title="Committee codes (chair / SMT)">
      <p className="text-sm text-brand-muted mb-6 max-w-xl">
        Each committee has a <strong>committee code</strong> within its conference (second gate after
        delegates enter the conference code). Codes must be unique within the same conference event.
        After saving, you can enter that committee or share the code on the dais.
      </p>
      <RoomCodeChairForm conferences={conferences ?? []} />
    </MunPageShell>
  );
}
