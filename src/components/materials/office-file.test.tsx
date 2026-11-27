/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FilePreview } from "@/components/materials/file-preview";

/**
 * The path from a real `.pptx` to the reader, end to end: the panel fetches the
 * bytes, `readDeck` parses them, and what lands on screen is a slide with two
 * arrows — not an index of digits under it.
 */

const EMU = 9525;

async function deckBytes(slides: number): Promise<Uint8Array> {
  const zip = new JSZip();
  const ids = Array.from({ length: slides }, (_, index) => index + 1);
  zip.file(
    "ppt/presentation.xml",
    `<?xml version="1.0"?>
<presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldSz cx="${1280 * EMU}" cy="${720 * EMU}"/>
  <p:sldIdLst>${ids.map((id) => `<p:sldId id="${255 + id}" r:id="rId${id}"/>`).join("")}</p:sldIdLst>
</presentation>`,
  );
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${ids
  .map(
    (id) =>
      `<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${id}.xml"/>`,
  )
  .join("")}
</Relationships>`,
  );
  for (const id of ids) {
    zip.file(
      `ppt/slides/slide${id}.xml`,
      `<?xml version="1.0"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree>
    <p:sp>
      <p:spPr><a:xfrm><a:off x="${100 * EMU}" y="${60 * EMU}"/><a:ext cx="${800 * EMU}" cy="${120 * EMU}"/></a:xfrm></p:spPr>
      <p:txBody><a:bodyPr anchor="ctr"/><a:p><a:r><a:rPr sz="3200"/><a:t>Slide ${id} heading</a:t></a:r></a:p></p:txBody>
    </p:sp>
  </p:spTree></p:cSld>
</p:sld>`,
    );
  }
  return zip.generateAsync({ type: "uint8array" });
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("a deck opened in the library", () => {
  it("draws the first slide and a quiet counter", async () => {
    const bytes = await deckBytes(3);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, arrayBuffer: async () => bytes.buffer })),
    );

    await act(async () => {
      root.render(<FilePreview kind="pptx" title="Referral pathway" fileHref="/api/materials/x/file" />);
    });
    await vi.waitFor(() => expect(container.textContent).toContain("1 / 3"));

    expect(container.textContent).toContain("Slide 1 heading");
    expect(container.querySelectorAll("ol")).toHaveLength(0);
    expect(container.querySelectorAll("button")).toHaveLength(2);
  });

  it("says plainly when the deck cannot be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) })),
    );

    await act(async () => {
      root.render(<FilePreview kind="pptx" title="Broken deck" fileHref="/api/materials/x/file" />);
    });
    await vi.waitFor(() => expect(container.textContent).toContain("could not be drawn"));
  });
});
