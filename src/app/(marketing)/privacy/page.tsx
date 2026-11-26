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
            `The ${SITE.fullName} is an internal service for GHS staff. It stores the material from training programmes, records what each person opened, acknowledged or completed, and keeps the audit history that makes those records trustworthy.`,
          ],
        },
        {
          heading: "What we collect",
          paragraphs: [
            "Directory details: your staff ID, name, work email, role, directorate, region and facility.",
            "Training records: material you open or download, and the acknowledgements you sign, against the version you saw. Views are counted once per person per day. Downloads are recorded because controlled material leaves the platform this way. Nothing here is a grade, a credit or a certificate.",
            "Communication: messages you send and notices addressed to you.",
            "Security records: sign-in and sign-out events, the network address and browser used, and audit entries for privileged actions.",
            `The ${SITE.name} does not hold patient information. Do not send it through messages or support requests.`,
          ],
        },
        {
          heading: "Why we use it",
          paragraphs: [
            "To catalogue each training programme's material, keep superseded versions available, let staff find the version that applies to them, record what staff actually consulted, and keep the platform secure and accountable for what was uploaded, changed or withdrawn.",
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
            "You can see your own records. Facilitators see learning progress within their directorate. System administrators see directory records, and every administrative action is written to the tamper-evident audit trail.",
            "Activity records are used in aggregate for programme reporting. Nothing in them is published, and no individual's reading history is shared outside the service.",
          ],
        },
        {
          heading: "Security",
          paragraphs: [
            "Connections are encrypted. Access is role-based and enforced on the server. Privileged actions are written to a tamper-evident audit trail, so changes cannot be made quietly.",
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
