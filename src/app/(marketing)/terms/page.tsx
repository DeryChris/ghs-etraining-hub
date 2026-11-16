import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of use"
      title="Using GHS-ELN"
      intro="These terms apply to every person who signs in to GHS-ELN. By using the platform you agree to them."
      updated={SITE.policyUpdated}
      sections={[
        {
          heading: "Acceptable use",
          paragraphs: [
            "Use GHS-ELN for your professional learning and for work tasks connected to your role. Do not try to access content, records or accounts that are not assigned to you.",
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
            "Documents, videos and labs on GHS-ELN belong to the Ghana Health Service. Do not copy, republish or share controlled material outside GHS without authorisation. Access to controlled documents is recorded.",
          ],
        },
        {
          heading: "Learning records and CPD",
          paragraphs: [
            "Points and certificates are awarded when a material is completed under the rules of the relevant directorate. A certificate can be checked on the verification page. Records that were issued in error can be corrected by an administrator, and the correction is recorded.",
          ],
        },
        {
          heading: "Messages and discussion",
          paragraphs: [
            "Keep messages professional and about work. Do not include patient information. Facilitators may moderate discussion, and administrators may review messages reported as inappropriate.",
          ],
        },
        {
          heading: "Availability",
          paragraphs: [
            "We aim to keep GHS-ELN available at all times. Planned maintenance is announced in advance on the platform. We do not guarantee uninterrupted access.",
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
