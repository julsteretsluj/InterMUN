import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { RoomCodesAndChairsClient } from "./RoomCodesAndChairsClient";

export default async function SmtRoomCodesPage() {
  const t = await getTranslations("smtRoomCodesPage");
  const supabase = await createClient();
  const eventId = await getActiveEventId();
  const adminInviteConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!eventId) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-center text-brand-muted">
        <p className="mb-4">{t("selectEventFirst")}</p>
        <Link
          href="/event-gate?next=%2Fsmt%2Froom-codes"
          className="inline-block px-4 py-2 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft"
        >
          {t("enterConferenceCode")}
        </Link>
      </div>
    );
  }

  const { data: conferences } = await supabase
    .from("conferences")
    .select("id, name, committee, committee_code")
    .eq("event_id", eventId)
    .order("committee", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-brand-navy mb-2">{t("title")}</h1>
      <p className="text-sm text-brand-muted mb-6 max-w-2xl">{t("subtitle")}</p>
      <RoomCodesAndChairsClient
        conferences={conferences ?? []}
        adminInviteConfigured={adminInviteConfigured}
      />
    </div>
  );
}
