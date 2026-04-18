import { OFFICIAL_UN_LINK_GROUPS } from "@/lib/official-un-links";

export function OfficialLinksPanel() {
  return (
    <>
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
                    className="text-brand-diplomatic underline decoration-brand-diplomatic/35 underline-offset-2 hover:decoration-brand-diplomatic dark:text-brand-accent-bright dark:decoration-brand-accent-bright/45"
                  >
                    {link.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
