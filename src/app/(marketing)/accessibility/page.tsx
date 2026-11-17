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
          heading: "What is in place",
          paragraphs: [
            "Every page can be used with a keyboard, and focus is always visible. Light and dark themes are both available, and the system setting is respected by default.",
            "Text follows your browser's font size settings. Animations are reduced when your device asks for less motion. Forms have visible labels and plain-English error messages.",
            "Pages are light and text-first, so they stay usable on a slow mobile connection. Videos load only when you press play.",
          ],
        },
        {
          heading: "What is still missing",
          paragraphs: [
            "Not every video has captions yet. Some older documents may be scanned images without structure, so screen readers cannot read them well. We are working through both.",
          ],
        },
        {
          heading: "Tell us what does not work",
          paragraphs: [
            "If something is hard to use, tell us through the contact page. Include the page, your device and browser, and what you were trying to do. We will use it to prioritise fixes.",
          ],
        },
      ]}
    />
  );
}
