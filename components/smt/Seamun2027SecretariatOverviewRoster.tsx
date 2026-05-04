import { getTranslations } from "next-intl/server";
import {
  SEAMUN_I_2027_SECRETARIAT_CONTACTS,
  SEAMUN_I_2027_LEADERSHIP,
  SEAMUN_I_2027_MEDIA,
  SEAMUN_I_2027_OPERATIONS,
  emailLooksClickable,
} from "@/lib/seamun-i-2027-secretariat-roster";

function EmailCell({ email }: { email: string | null }) {
  const raw = email?.trim() ?? "";
  if (!raw) return <span className="text-brand-muted">—</span>;
  if (emailLooksClickable(raw)) {
    return (
      <a href={`mailto:${raw}`} className="text-brand-accent hover:underline break-all">
        {raw}
      </a>
    );
  }
  return <span className="break-words text-brand-navy/90">{raw}</span>;
}

export async function Seamun2027SecretariatOverviewRoster() {
  const t = await getTranslations("smtCards");

  return (
    <section
      className="space-y-6 border-t border-brand-navy/10 pt-5"
      aria-labelledby="secretariat-oversight-heading"
    >
      <div>
        <h2 id="secretariat-oversight-heading" className="font-display text-lg font-semibold text-brand-navy">
          {t("secretariatOversightTitle")}
        </h2>
        <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-brand-navy/90">
          <span>
            <span className="text-brand-muted">{t("secretariatMatrixSmtEmail")}: </span>
            <a
              href={`mailto:${SEAMUN_I_2027_SECRETARIAT_CONTACTS.smtEmail}`}
              className="font-mono text-xs text-brand-accent hover:underline"
            >
              {SEAMUN_I_2027_SECRETARIAT_CONTACTS.smtEmail}
            </a>
          </span>
          <span>
            <span className="text-brand-muted">{t("secretariatMatrixFinanceEmail")}: </span>
            <a
              href={`mailto:${SEAMUN_I_2027_SECRETARIAT_CONTACTS.financeEmail}`}
              className="font-mono text-xs text-brand-accent hover:underline"
            >
              {SEAMUN_I_2027_SECRETARIAT_CONTACTS.financeEmail}
            </a>
          </span>
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          {t("secretariatMatrixSectionSecretariat")}
        </h3>
        <div className="overflow-x-auto rounded-lg border border-brand-navy/10 bg-brand-cream/15">
          <table
            className="w-full min-w-[640px] border-collapse text-left text-sm"
            aria-label={t("secretariatMatrixSectionSecretariat")}
          >
            <thead>
              <tr className="border-b border-brand-navy/10 bg-brand-paper">
                <th className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  {t("secretariatMatrixRole")}
                </th>
                <th className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  {t("secretariatMatrixName")}
                </th>
                <th className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  {t("secretariatMatrixEmail")}
                </th>
                <th className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  {t("secretariatMatrixCommitteeOverviews")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-navy/10">
              {SEAMUN_I_2027_LEADERSHIP.map((row, i) => (
                <tr key={i} className="bg-brand-paper">
                  <td className="px-3 py-2.5 text-brand-navy/90">{row.role}</td>
                  <td className="px-3 py-2.5 font-medium text-brand-navy">{row.name}</td>
                  <td className="px-3 py-2.5">
                    <EmailCell email={row.email} />
                  </td>
                  <td className="px-3 py-2.5 text-brand-navy/90">
                    <span className="text-brand-muted">—</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          {t("secretariatMatrixSectionOperations")}
        </h3>
        <div className="overflow-x-auto rounded-lg border border-brand-navy/10 bg-brand-cream/15">
          <table
            className="w-full min-w-[520px] border-collapse text-left text-sm"
            aria-label={t("secretariatMatrixSectionOperations")}
          >
            <thead>
              <tr className="border-b border-brand-navy/10 bg-brand-paper">
                <th className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  {t("secretariatMatrixRole")}
                </th>
                <th className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  {t("secretariatMatrixName")}
                </th>
                <th className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  {t("secretariatMatrixEmail")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-navy/10">
              {SEAMUN_I_2027_OPERATIONS.map((row, i) => (
                <tr key={i} className="bg-brand-paper">
                  <td className="px-3 py-2.5 text-brand-navy/90">{row.role}</td>
                  <td className="px-3 py-2.5 font-medium text-brand-navy">{row.name}</td>
                  <td className="px-3 py-2.5">
                    <EmailCell email={row.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          {t("secretariatMatrixSectionMedia")}
        </h3>
        <div className="overflow-x-auto rounded-lg border border-brand-navy/10 bg-brand-cream/15">
          <table
            className="w-full min-w-[520px] border-collapse text-left text-sm"
            aria-label={t("secretariatMatrixSectionMedia")}
          >
            <thead>
              <tr className="border-b border-brand-navy/10 bg-brand-paper">
                <th className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  {t("secretariatMatrixRole")}
                </th>
                <th className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  {t("secretariatMatrixName")}
                </th>
                <th className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  {t("secretariatMatrixEmail")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-navy/10">
              {SEAMUN_I_2027_MEDIA.map((row, i) => (
                <tr key={i} className="bg-brand-paper">
                  <td className="px-3 py-2.5 text-brand-navy/90">{row.role}</td>
                  <td className="px-3 py-2.5 font-medium text-brand-navy">{row.name}</td>
                  <td className="px-3 py-2.5">
                    <EmailCell email={row.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
