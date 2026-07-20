import { redirect } from "next/navigation";
import {
  ADMIN_NAV_HREF_ORDER,
  sortNavByHrefPriority,
  withSequentialPriority,
} from "@/lib/nav-priority-order";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { AppleAppFrame } from "@/components/ui/AppleAppShell";
import { getAppName } from "@/lib/branding";
import { AdminAppChrome } from "@/components/admin/AdminAppChrome";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  if (!isAdminRole(profile?.role)) {
    redirect("/profile");
  }

  const eventId = await getActiveEventId();
  const appName = getAppName();
  const { data: activeEvent } = eventId
    ? await supabase
        .from("conference_events")
        .select("name, event_code")
        .eq("id", eventId)
        .maybeSingle()
    : { data: null };

  const adminNav = withSequentialPriority(
    sortNavByHrefPriority(
      [
        { href: "/admin", label: "Overview" },
        { href: "/smt", label: "SMT dashboard" },
        { href: "/admin/newsroom", label: "Newsroom" },
        { href: "/admin/press-corps", label: "Press Corps" },
        { href: "/admin/milestones", label: "Milestones" },
        { href: "/admin/guides", label: "Guides" },
        { href: "/conference-setup?next=%2Fadmin", label: "New conference" },
        { href: "/smt/profile", label: "Profile" },
      ],
      ADMIN_NAV_HREF_ORDER
    )
  );

  return (
    <AppleAppFrame appName={appName}>
      <AdminAppChrome
        appName={appName}
        navItems={adminNav}
        activeEventName={activeEvent?.name ?? null}
        activeEventCode={activeEvent?.event_code ?? null}
      >
        {children}
      </AdminAppChrome>
      <PaperSavedWidget />
    </AppleAppFrame>
  );
}
