/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MaterialViewer } from "@/components/materials/material-viewer";

/**
 * Full screen has to work on the device this product is actually used on.
 *
 * The reader used to hand the job to `requestFullscreen`, which iOS Safari does
 * not implement for anything but `<video>`; the button then did nothing at all.
 * The viewport-sized panel is ours, and the browser's version is a bonus — so
 * these tests never stub the Fullscreen API, which is the phone's situation.
 */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render() {
  act(() =>
    root.render(
      <MaterialViewer materialId="11111111-1111-4111-8111-111111111111" title="Hand hygiene" mimeType="application/pdf" sizeBytes={2_400_000} />,
    ),
  );
}

function press(label: string) {
  const button = container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);
  expect(button, label).not.toBeNull();
  act(() => button?.click());
}

describe("the file panel", () => {
  it("is a strip of actions and then the file — no paragraph of chrome", () => {
    render();

    expect(container.textContent).toContain("PDF");
    expect(container.textContent).toContain("2.3 MB");
    // The old header said "Read it here" over a line about being recorded.
    expect(container.textContent).not.toContain("Read it here");
    expect(container.textContent).not.toContain("recorded");
    // Three controls: a tab, a download, and the screen.
    expect(container.querySelectorAll('[aria-label="Open in a new tab"], [aria-label="Download"], [aria-label="Full screen"]')).toHaveLength(3);
  });

  it("expands to the viewport even where the Fullscreen API is missing", () => {
    render();

    const section = container.querySelector("section");
    expect(section?.className).not.toContain("fixed");

    press("Full screen");
    expect(section?.className).toContain("fixed");
    expect(section?.className).toContain("inset-0");
    expect(container.querySelector("[aria-pressed]")?.getAttribute("aria-pressed")).toBe("true");

    press("Leave full screen");
    expect(container.querySelector("section")?.className).not.toContain("fixed");
  });

  it("lets Escape leave full screen", () => {
    render();
    press("Full screen");

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(container.querySelector("section")?.className).not.toContain("fixed");
  });

  it("downloads and opens in a tab from the same strip", () => {
    render();

    const download = container.querySelector<HTMLAnchorElement>('[aria-label="Download"]');
    expect(download?.getAttribute("href")).toBe("/api/materials/11111111-1111-4111-8111-111111111111/file?download=1");

    const tab = container.querySelector<HTMLAnchorElement>('[aria-label="Open in a new tab"]');
    expect(tab?.getAttribute("href")).toBe("/api/materials/11111111-1111-4111-8111-111111111111/file");
    expect(tab?.getAttribute("target")).toBe("_blank");
  });
});
