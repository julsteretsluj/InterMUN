import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { OFFICIAL_UN_LINK_GROUPS } from "@/lib/official-un-links";

export default async function ChairOfficialLinksPage() {
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
  const role = profile?.role?.toString().toLowerCase();
  if (role !== "chair" && role !== "smt" && role !== "admin") {
    redirect("/profile");
  }

  return (
    <MunPageShell title="Official UN links">
      <p className="mb-6 text-sm text-slate-600 dark:text-zinc-400">
        Documents, treaties, main bodies, programmes, missions, and member info. Opens in a new tab.
      </p>
      <div className="space-y-8">
        {OFFICIAL_UN_LINK_GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-zinc-50">
              {group.title}
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {group.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline decoration-blue-700/30 underline-offset-2 hover:decoration-blue-700 dark:text-blue-400 dark:decoration-blue-400/40"
                  >
                    {link.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </MunPageShell>
  );
}
