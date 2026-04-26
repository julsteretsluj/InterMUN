import { AdminDashboardClient } from "./AdminDashboardClient";
import StatusPortalBoard from "./StatusPortalBoard";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";
import { getTranslations } from "next-intl/server";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; tab?: string }>;
}) {
  const { e, tab } = await searchParams;
  const adminInviteConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const t = await getTranslations("adminPage");
  const activeTab =
    tab === "portal" || tab === "checklist" || tab === "setup"
      ? tab
      : "setup";

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

      <div className="flex flex-wrap gap-1 border-b border-brand-navy/10" role="tablist" aria-label={t("tabs.ariaLabel")}>
        {[
          { id: "setup", label: t("tabs.setup") },
          { id: "checklist", label: t("tabs.checklist") },
          { id: "portal", label: t("tabs.portal") },
        ].map((item) => (
          <a
            key={item.id}
            href={item.id === "setup" ? "/admin" : `/admin?tab=${item.id}`}
            role="tab"
            aria-selected={activeTab === item.id}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === item.id
                ? "border-brand-accent text-brand-navy bg-brand-paper"
                : "border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
      <div className="mt-6" role="tabpanel">
        {activeTab === "setup" ? <AdminDashboardClient adminInviteConfigured={adminInviteConfigured} /> : null}
        {activeTab === "checklist" ? <RoleSetupChecklist role="admin" /> : null}
        {activeTab === "portal" ? <StatusPortalBoard /> : null}
      </div>
    </div>
  );
}
