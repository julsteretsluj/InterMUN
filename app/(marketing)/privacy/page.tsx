import type { Metadata } from "next";
import { MarketingDocumentPage } from "@/components/marketing/MarketingDocumentPage";
import { getAppName, getPartnershipContactEmail } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Privacy Policy | InterMUN",
  description: "How InterMUN collects, uses, stores, and protects personal information.",
};

export default function PrivacyPage() {
  const appName = getAppName();
  const contactEmail = getPartnershipContactEmail();
  const contact = contactEmail ? (
    <a href={`mailto:${contactEmail}`} className="font-semibold text-[var(--accent)] hover:underline">
      {contactEmail}
    </a>
  ) : (
    "the contact form on our website"
  );

  return (
    <MarketingDocumentPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro={`This policy explains how ${appName} handles personal information when you use our website, applications, and conference services.`}
      updated="25 July 2026"
      sections={[
        {
          title: "Information we collect",
          content: (
            <>
              <p>Depending on how you use the service, we may collect:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Account details such as your name, email address, profile, and role.</li>
                <li>Conference information, committee assignments, and participation records.</li>
                <li>Content you create, including documents, notes, messages, votes, and submissions.</li>
                <li>Files you upload and communications you send to conference teams or to us.</li>
                <li>Technical and usage data needed to operate, secure, and improve the service.</li>
              </ul>
            </>
          ),
        },
        {
          title: "How we use information",
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide accounts, conference workspaces, and role-based features.</li>
              <li>Deliver content to the participants and staff authorised to access it.</li>
              <li>Maintain security, prevent abuse, troubleshoot problems, and improve reliability.</li>
              <li>Respond to support, partnership, and conference enquiries.</li>
              <li>Comply with applicable law and enforce our Terms of Service.</li>
            </ul>
          ),
        },
        {
          title: "Sharing and conference access",
          content: (
            <>
              <p>
                We do not sell personal information. Information may be shared with your conference
                organiser and authorised participants according to their roles and the features they use.
              </p>
              <p>
                We may also use trusted service providers for hosting, authentication, email, storage,
                security, and related infrastructure. They may process information only to provide those
                services to us.
              </p>
            </>
          ),
        },
        {
          title: "Retention and security",
          content: (
            <>
              <p>
                We retain information for as long as needed to provide the service, support a conference,
                meet legal obligations, resolve disputes, and protect the platform. Retention periods can
                vary by data type and conference requirements.
              </p>
              <p>
                We use technical and organisational safeguards designed to protect information. No online
                service can guarantee absolute security, so users should also protect their credentials and
                report suspected account misuse promptly.
              </p>
            </>
          ),
        },
        {
          title: "Your choices and rights",
          content: (
            <>
              <p>
                You may update certain account information within the service. Depending on your location,
                you may also have rights to access, correct, delete, restrict, or receive a copy of your
                personal information.
              </p>
              <p>
                Conference records may be controlled jointly with or on behalf of your conference
                organiser. We may direct a request to that organiser where appropriate.
              </p>
            </>
          ),
        },
        {
          title: "Children and student participants",
          content: (
            <p>
              Conferences and schools are responsible for ensuring that participants are authorised to use
              the service and that any required parent or guardian consent has been obtained. Please contact
              us if you believe a participant&apos;s information was provided without appropriate
              authorisation.
            </p>
          ),
        },
        {
          title: "Changes and contact",
          content: (
            <>
              <p>
                We may update this policy as the service or applicable requirements change. The date above
                shows the latest revision.
              </p>
              <p>For privacy questions or requests, contact {contact}.</p>
            </>
          ),
        },
      ]}
    />
  );
}
