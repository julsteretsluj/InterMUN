import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { RoomCodeChairForm } from "./RoomCodeChairForm";
import { canChairSwitchAnyCommitteeForTesting } from "@/lib/testing-overrides";
import { getTranslations } from "next-intl/server";

export default async function ChairRoomCodePage() {
  const t = await getTranslations("pageTitles");
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
  const bypassSeatRestriction = canChairSwitchAnyCommitteeForTesting(user.email);

  let conferencesQuery = supabase
    .from("conferences")
    .select("id, name, committee, room_code, committee_code")
    .order("created_at", { ascending: false });

  if (role === "chair" && !bypassSeatRestriction) {
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
      const tRoom = await getTranslations("chairRoomCodePage");
      return (
        <MunPageShell title={t("committeeCodes")} variant="default">
          <p className="text-sm text-brand-muted mb-4 max-w-xl">
            {tRoom("noSeat")}
          </p>
        </MunPageShell>
      );
    }
    conferencesQuery = conferencesQuery.in("id", allowedIds);
  }

  const { data: conferences } = await conferencesQuery;
  const tRoom = await getTranslations("chairRoomCodePage");

  return (
    <MunPageShell title={t("committeeCodes")} variant="offset">
      <p className="text-sm text-brand-muted mb-6 max-w-xl">
        {tRoom("intro")}
        {role === "chair" && bypassSeatRestriction ? (
          <>
            {" "}
            {tRoom("testingOverride")}
          </>
        ) : role === "chair" ? (
          <>
            {" "}
            {tRoom("chairScope")}
          </>
        ) : (
          <> {tRoom("staffAfterSave")}</>
        )}
      </p>
      <RoomCodeChairForm conferences={conferences ?? []} />
    </MunPageShell>
  );
}
