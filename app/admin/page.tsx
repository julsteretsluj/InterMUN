import { AdminDashboardClient } from "./AdminDashboardClient";
import StatusPortalBoard from "./StatusPortalBoard";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";
import { getTranslations } from "next-intl/server";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const adminInviteConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const t = await getTranslations("adminPage");

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold text-brand-navy">{t("title")}</h1>
      <p className="mb-6 max-w-2xl text-sm text-brand-muted">{t("intro")}</p>

      {e === "no-session-floor" && (
        <div
          className="mb-6 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          {t.rich("noSessionFloor", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </div>
      )}

      <AdminDashboardClient adminInviteConfigured={adminInviteConfigured} />

      <div className="mt-10">
        <RoleSetupChecklist role="admin" />
      </div>

      <div className="mt-10">
        <StatusPortalBoard />
      </div>
    </div>
  );
}
