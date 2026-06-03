import { AdminDashboardClient } from "./AdminDashboardClient";
import StatusPortalBoard from "./StatusPortalBoard";
import { PriorityTabLink } from "@/components/PriorityTabLink";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";
import {
  ADMIN_DASHBOARD_TAB_ORDER,
  sortByKeyPriority,
  withSequentialPriority,
} from "@/lib/nav-priority-order";
import { getTranslations } from "next-intl/server";
import { isAdminInviteConfigured } from "@/lib/admin-invite-configured";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; tab?: string }>;
}) {
  const { e, tab } = await searchParams;
  const adminInviteConfigured = isAdminInviteConfigured();
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
        {withSequentialPriority(
          sortByKeyPriority(
            [
              { id: "setup", label: t("tabs.setup") },
              { id: "checklist", label: t("tabs.checklist") },
              { id: "portal", label: t("tabs.portal") },
            ],
            "id",
            ADMIN_DASHBOARD_TAB_ORDER
          )
        ).map((item) => (
          <PriorityTabLink
            key={item.id}
            href={item.id === "setup" ? "/admin" : `/admin?tab=${item.id}`}
            label={item.label}
            priority={item.priority}
            active={activeTab === item.id}
            activeClassName="border-brand-accent text-brand-navy bg-brand-paper"
            inactiveClassName="border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
          />
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
