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
          <div
            className="grid min-w-[640px] grid-cols-[1.15fr_1fr_1.25fr_0.95fr] gap-px bg-brand-navy/10 text-sm"
            role="table"
            aria-label={t("secretariatMatrixSectionSecretariat")}
          >
            <div
              className="bg-brand-paper px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted"
              role="columnheader"
            >
              {t("secretariatMatrixRole")}
            </div>
            <div
              className="bg-brand-paper px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted"
              role="columnheader"
            >
              {t("secretariatMatrixName")}
            </div>
            <div
              className="bg-brand-paper px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted"
              role="columnheader"
            >
              {t("secretariatMatrixEmail")}
            </div>
            <div
              className="bg-brand-paper px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted"
              role="columnheader"
            >
              {t("secretariatMatrixCommitteeOverviews")}
            </div>
            {SEAMUN_I_2027_LEADERSHIP.map((row, i) => (
              <div key={i} className="contents" role="row">
                <div className="bg-brand-paper px-3 py-2.5 text-brand-navy/90">{row.role}</div>
                <div className="bg-brand-paper px-3 py-2.5 font-medium text-brand-navy">{row.name}</div>
                <div className="bg-brand-paper px-3 py-2.5">
                  <EmailCell email={row.email} />
                </div>
                <div className="bg-brand-paper px-3 py-2.5 text-brand-navy/90">
                  {row.role === "Parliamentarian" ? (
                    <span className="inline-flex rounded-md border border-brand-navy/15 bg-brand-cream/40 px-2 py-0.5 text-xs font-medium text-brand-navy">
                      {row.committeeOverviewTier}
                    </span>
                  ) : (
                    <span className="text-brand-muted">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          {t("secretariatMatrixSectionOperations")}
        </h3>
        <div className="overflow-x-auto rounded-lg border border-brand-navy/10 bg-brand-cream/15">
          <div
            className="grid min-w-[520px] grid-cols-[1.2fr_1fr_1.4fr] gap-px bg-brand-navy/10 text-sm"
            role="table"
            aria-label={t("secretariatMatrixSectionOperations")}
          >
            <div className="bg-brand-paper px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
              {t("secretariatMatrixRole")}
            </div>
            <div className="bg-brand-paper px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
              {t("secretariatMatrixName")}
            </div>
            <div className="bg-brand-paper px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
              {t("secretariatMatrixEmail")}
            </div>
            {SEAMUN_I_2027_OPERATIONS.map((row, i) => (
              <div key={i} className="contents" role="row">
                <div className="bg-brand-paper px-3 py-2.5 text-brand-navy/90">{row.role}</div>
                <div className="bg-brand-paper px-3 py-2.5 font-medium text-brand-navy">{row.name}</div>
                <div className="bg-brand-paper px-3 py-2.5">
                  <EmailCell email={row.email} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          {t("secretariatMatrixSectionMedia")}
        </h3>
        <div className="overflow-x-auto rounded-lg border border-brand-navy/10 bg-brand-cream/15">
          <div
            className="grid min-w-[520px] grid-cols-[1.2fr_1fr_1.4fr] gap-px bg-brand-navy/10 text-sm"
            role="table"
            aria-label={t("secretariatMatrixSectionMedia")}
          >
            <div className="bg-brand-paper px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
              {t("secretariatMatrixRole")}
            </div>
            <div className="bg-brand-paper px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
              {t("secretariatMatrixName")}
            </div>
            <div className="bg-brand-paper px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
              {t("secretariatMatrixEmail")}
            </div>
            {SEAMUN_I_2027_MEDIA.map((row, i) => (
              <div key={i} className="contents" role="row">
                <div className="bg-brand-paper px-3 py-2.5 text-brand-navy/90">{row.role}</div>
                <div className="bg-brand-paper px-3 py-2.5 font-medium text-brand-navy">{row.name}</div>
                <div className="bg-brand-paper px-3 py-2.5">
                  <EmailCell email={row.email} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
