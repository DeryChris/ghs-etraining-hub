import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy notice"
      title={`How the ${SITE.name} handles your personal data`}
      intro="This notice explains what the platform records about you, why, who can see it, and how you can ask questions or make a request."
      updated={SITE.policyUpdated}
      sections={[
        {
          heading: "Who we are",
          paragraphs: [
            `The ${SITE.fullName} is a GHS staff service with public Programme Area/Field browsing and public support forms. It stores training materials, records signed-in opens and downloads, and keeps an audit history of administrative changes.`,
          ],
        },
        {
          heading: "What we collect",
          paragraphs: [
            "Directory details: your staff ID, name, work email, role, directorate, region and facility.",
            "Reading records: which material you open or download and the version involved. Views are recorded by staff member, material and date; downloads are recorded because a file leaves the platform.",
            "Communication: messages you send and notices addressed to you.",
            "Security records: sign-in and sign-out events, the network address and browser used, and audit entries for privileged actions.",
            `The ${SITE.name} does not hold patient information. Do not send it through messages or support requests.`,
          ],
        },
        {
          heading: "Why we use it",
          paragraphs: [
            "To keep each training programme's material in one library, keep superseded versions available, let staff find the version that applies to them, record what staff actually consulted, and keep the platform secure and accountable for what was uploaded, changed or withdrawn.",
          ],
        },
        {
          heading: "Legal basis",
          paragraphs: [
            "Processing supports the functions of the Ghana Health Service and is governed by the Data Protection Act, 2012 (Act 843). The precise legal basis wording is to be confirmed by GHS legal counsel before publication.",
          ],
        },
        {
          heading: "How long we keep it",
          paragraphs: [
            "Audit records are kept for seven years. Reading and activity records follow the GHS records retention schedule, which is being confirmed.",
          ],
        },
        {
          heading: "Who can see it",
          paragraphs: [
            "You can see your own activity. Facilitators see aggregate activity within their assigned Programme Areas and Programme Fields. System administrators manage directory records; privileged actions are recorded in the tamper-evident audit trail.",
            "The public account-claim form shows a read-only preview of the single directory row matching the Staff ID entered. The public Complaint Hub status lookup shows complaints and saved responses associated with a supplied Staff ID; temporary-password text from older responses is redacted. Both are rate-limited and do not require sign-in; neither returns account contact details through the lookup result.",
            "Public Programme browse and aggregate counters do not show author names, Staff IDs or individual reading histories.",
          ],
        },
        {
          heading: "Security",
          paragraphs: [
            "Access is role-based and enforced on the server. Privileged actions are recorded in the tamper-evident audit trail. Production deployments should serve traffic over encrypted HTTPS connections.",
          ],
        },
        {
          heading: "Your rights and how to ask",
          paragraphs: [
            "Under the Data Protection Act you can ask what personal data we hold about you, ask for corrections, and raise concerns. Start a request through the contact page.",
          ],
        },
        {
          heading: "Changes to this notice",
          paragraphs: [
            "We will update this notice when our processing changes and show the date of the latest version at the top of the page.",
          ],
        },
      ]}
    />
  );
}
