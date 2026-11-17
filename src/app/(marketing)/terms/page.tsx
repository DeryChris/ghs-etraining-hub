import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of use"
      title={`Using the ${SITE.name}`}
      intro={`These terms apply to every person who signs in to the ${SITE.fullName}. By using the service you agree to them.`}
      updated={SITE.policyUpdated}
      sections={[
        {
          heading: "Acceptable use",
          paragraphs: [
            `Use the ${SITE.name} for your professional learning and for work tasks connected to your role. Do not try to access material, records or accounts that are not assigned to you.`,
          ],
        },
        {
          heading: "Your account",
          paragraphs: [
            "Your account is personal. Do not share your password or let someone else use your session. Tell your facility ICT officer straight away if you think someone else has used your account.",
          ],
        },
        {
          heading: "Controlled content",
          paragraphs: [
            `Material on the ${SITE.name} belongs to the Ghana Health Service and to the programme that produced it. Do not copy, republish or share it outside GHS without authorisation. Uploads, approvals, downloads and withdrawals are recorded.`,
          ],
        },
        {
          heading: "What the library records",
          paragraphs: [
            "The library records which material you opened, downloaded and marked as finished, against the version you saw. It does not award points, levels or certificates: it is an information service. Certificates issued before the CPD award was retired remain valid and checkable on the verification page, and they are not deleted. Records made in error can be corrected by an administrator, and the correction is recorded.",
          ],
        },
        {
          heading: "Messages and discussion",
          paragraphs: [
            "Keep messages professional and about work. Do not include patient information. Messages can be reviewed when a complaint about conduct is raised.",
          ],
        },
        {
          heading: "Availability",
          paragraphs: [
            `We aim to keep the ${SITE.name} available at all times. Planned maintenance is announced in advance on the platform. We do not guarantee uninterrupted access.`,
          ],
        },
        {
          heading: "Changes",
          paragraphs: [
            "We may update these terms. Material changes are announced on the platform before they take effect.",
          ],
        },
        {
          heading: "Governing law",
          paragraphs: ["These terms are governed by the laws of the Republic of Ghana."],
        },
      ]}
    />
  );
}
