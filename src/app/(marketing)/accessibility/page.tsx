import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Accessibility" };

export default function AccessibilityPage() {
  return (
    <LegalPage
      eyebrow="Accessibility"
      title="Designed to work for everyone"
      intro={`The ${SITE.name} is for staff who work long shifts, on different devices, with different needs. This page states what we aim for and what is still missing.`}
      updated={SITE.policyUpdated}
      sections={[
        {
          heading: "Our commitment",
          paragraphs: [
            "We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA across the platform.",
          ],
        },
        {
          heading: "Implemented foundations",
          paragraphs: [
            "Shared controls and navigation include visible keyboard-focus styles. Light and dark themes are supported, with the system preference used by default.",
            "Motion is reduced when a device requests reduced motion. Layouts adapt to smaller screens and use scalable text.",
          ],
        },
        {
          heading: "Review still needed",
          paragraphs: [
            "A full route-by-route WCAG 2.2 AA audit has not been completed. Uploaded materials also need review: videos should have captions, and documents should use accessible text or an alternative when a scan cannot be read by assistive technology.",
          ],
        },
        {
          heading: "Report an accessibility barrier",
          paragraphs: [
            "Use the Complaint Hub from the Help page. Include the page, your device and browser, and what you were trying to do so the issue can be investigated.",
          ],
        },
      ]}
    />
  );
}
