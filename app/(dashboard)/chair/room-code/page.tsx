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

  const role = profile?.role;
  if (role !== "chair" && role !== "smt" && role !== "admin") {
    redirect("/profile");
  }

  let conferencesQuery = supabase
    .from("conferences")
    .select("id, name, committee, room_code, committee_code")
    .order("created_at", { ascending: false });

  if (role === "chair") {
    const { data: seats } = await supabase
      .from("allocations")
      .select("conference_id")
      .eq("user_id", user.id);
    const allowedIds = [
      ...new Set(
        (seats ?? []).map((s) => s.conference_id).filter((id): id is string => Boolean(id))
      ),
    ];
    if (allowedIds.length === 0) {
      return (
        <MunPageShell title="Committee codes (chair / SMT)">
          <p className="text-sm text-brand-muted mb-4 max-w-xl">
            You don&apos;t have a committee seat yet. Ask secretariat to assign you on the allocation
            matrix, then return here.
          </p>
        </MunPageShell>
      );
    }
    conferencesQuery = conferencesQuery.in("id", allowedIds);
  }

  const { data: conferences } = await conferencesQuery;

  return (
    <MunPageShell title="Committee codes (chair / SMT)">
      <p className="text-sm text-brand-muted mb-6 max-w-xl">
        Each committee has a <strong>committee code</strong> within its conference (second gate after
        delegates enter the conference code). Codes must be unique within the same conference event.
        {role === "chair" ? (
          <>
            {" "}
            As dais, you only see committees where you have a seat. Saving sends you to your profile;
            delegates who already passed the committee gate stay signed in until they log out.
          </>
        ) : (
          <> After saving, you can enter that committee or share the code on the dais.</>
        )}
      </p>
      <RoomCodeChairForm conferences={conferences ?? []} />
    </MunPageShell>
  );
}
