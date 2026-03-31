import { AdminDashboardClient } from "./AdminDashboardClient";
import StatusPortalBoard from "./StatusPortalBoard";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const adminInviteConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold text-brand-navy">Website administration</h1>
      <p className="mb-6 max-w-2xl text-sm text-brand-muted">
        Create conference events and manage who can run the secretariat tools. Day-to-day committee
        oversight lives in the SMT dashboard.
      </p>

      {e === "no-session-floor" && (
        <div
          className="mb-6 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          The session floor (timers, speakers, roll call) is for <strong>dais chairs</strong> only. Use{" "}
          <strong>SMT dashboard</strong> for live committees, or enter committee codes like delegates when
          you need a specific session.
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
