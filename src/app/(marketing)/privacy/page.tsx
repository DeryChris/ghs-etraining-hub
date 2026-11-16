import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy notice"
      title="How GHS-ELN handles your personal data"
      intro="This notice explains what the platform records about you, why, who can see it, and how you can ask questions or make a request."
      updated={SITE.policyUpdated}
      sections={[
        {
          heading: "Who we are",
          paragraphs: [
            "GHS-ELN is the Ghana Health Service eLearning Network. It is an internal platform for GHS staff to learn, acknowledge protocols and record continuing professional development.",
          ],
        },
        {
          heading: "What we collect",
          paragraphs: [
            "Directory details: your staff ID, name, work email, role, directorate, region and facility.",
            "Learning records: materials you open, acknowledgements, completions, CPD points and certificates.",
            "Communication: messages you send and notices addressed to you.",
            "Security records: sign-in and sign-out events, the network address and browser used, and audit entries for privileged actions.",
            "GHS-ELN does not hold patient information. Do not send it through messages or support requests.",
          ],
        },
        {
          heading: "Why we use it",
          paragraphs: [
            "To deliver mandatory protocols and training, record CPD, let facilitators support learners, keep controlled documents current, and keep the platform secure and accountable.",
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
            "Audit records are kept for seven years. Learning and certificate records follow the GHS records retention schedule, which is being confirmed.",
          ],
        },
        {
          heading: "Who can see it",
          paragraphs: [
            "You can see your own records. Facilitators see learning progress within their directorate. System administrators see directory records and the audit trail.",
            "Certificate verification shows only the holder's first name and last initial, the award, and the dates.",
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
