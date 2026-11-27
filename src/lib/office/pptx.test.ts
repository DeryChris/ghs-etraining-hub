/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { readDeck } from "./pptx";

/**
 * A deck built here, rather than a file checked in: the point of these tests is
 * that the numbers survive the trip — an EMU becomes a pixel, `sz="4400"` becomes
 * 44pt, `b="1"` stays bold, and a colour named by theme slot is resolved.
 */
const EMU = 9525;

function zip(parts: Record<string, string>): Promise<Uint8Array> {
  const archive = new JSZip();
  for (const [name, content] of Object.entries(parts)) archive.file(name, content);
  return archive.generateAsync({ type: "uint8array" });
}

function deckParts(slideXml: string, extra: Record<string, string> = {}) {
  return {
    "ppt/presentation.xml": `<?xml version="1.0"?>
<presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldSz cx="${1280 * EMU}" cy="${720 * EMU}"/>
  <p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst>
</presentation>`,
    "ppt/_rels/presentation.xml.rels": `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`,
    "ppt/theme/theme1.xml": `<?xml version="1.0"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <a:themeElements><a:clrScheme name="GHS">
    <a:dk1><a:srgbClr val="101828"/></a:dk1>
    <a:accent1><a:srgbClr val="1F6F5C"/></a:accent1>
  </a:clrScheme></a:themeElements>
</a:theme>`,
    "ppt/slides/slide1.xml": slideXml,
    ...extra,
  };
}

describe("readDeck", () => {
  it("turns EMU coordinates into pixels and keeps the text where it was put", async () => {
    const slide = `<?xml version="1.0"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree>
    <p:sp>
      <p:spPr><a:xfrm><a:off x="${100 * EMU}" y="${60 * EMU}"/><a:ext cx="${800 * EMU}" cy="${120 * EMU}"/></a:xfrm></p:spPr>
      <p:txBody>
        <a:bodyPr anchor="ctr"/>
        <a:p><a:pPr algn="ctr"/><a:r><a:rPr sz="4400" b="1"><a:solidFill><a:srgbClr val="1F6F5C"/></a:solidFill></a:rPr><a:t>Referral pathway</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>
  </p:spTree></p:cSld>
</p:sld>`;

    const deck = await readDeck(await zip(deckParts(slide)));

    expect(deck.width).toBe(1280);
    expect(deck.height).toBe(720);
    expect(deck.slides).toHaveLength(1);

    const shape = deck.slides[0].shapes[0];
    expect(shape.type).toBe("text");
    if (shape.type !== "text") throw new Error("expected a text shape");

    expect([shape.x, shape.y, shape.width, shape.height]).toEqual([100, 60, 800, 120]);
    expect(shape.anchor).toBe("middle");

    const run = shape.paragraphs[0].runs[0];
    expect(shape.paragraphs[0].align).toBe("center");
    expect(run.text).toBe("Referral pathway");
    expect(run.size).toBe(44);
    expect(run.bold).toBe(true);
    expect(run.color).toBe("#1f6f5c");
  });

  it("resolves a theme colour and a slide background", async () => {
    const slide = `<?xml version="1.0"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></p:bgPr></p:bg>
    <p:spTree>
      <p:sp>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${1280 * EMU}" cy="${80 * EMU}"/></a:xfrm>
          <a:solidFill><a:schemeClr val="accent1"/></a:solidFill></p:spPr>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

    const deck = await readDeck(await zip(deckParts(slide)));
    expect(deck.slides[0].background).toBe("#1f6f5c");

    const band = deck.slides[0].shapes[0];
    expect(band.type).toBe("shape");
    if (band.type !== "shape") throw new Error("expected a shape");
    expect(band.fill).toBe("#1f6f5c");
  });

  it("places a picture from the media part it points at", async () => {
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const slide = `<?xml version="1.0"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld><p:spTree>
    <p:pic>
      <p:nvPicPr><p:cNvPr name="Poster"/></p:nvPicPr>
      <p:blipFill><a:blip r:embed="rId2"/></p:blipFill>
      <p:spPr><a:xfrm><a:off x="${200 * EMU}" y="${200 * EMU}"/><a:ext cx="${400 * EMU}" cy="${300 * EMU}"/></a:xfrm></p:spPr>
    </p:pic>
  </p:spTree></p:cSld>
</p:sld>`;

    const deck = await readDeck(
      await zip(
        deckParts(slide, {
          "ppt/slides/_rels/slide1.xml.rels": `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`,
          "ppt/media/image1.png": "binary",
        }),
      ),
    );

    const picture = deck.slides[0].shapes[0];
    expect(picture.type).toBe("image");
    if (picture.type !== "image") throw new Error("expected an image");
    expect([picture.x, picture.y]).toEqual([200, 200]);
    // The bytes come from the archive, not from a guess about the file.
    expect(picture.src.startsWith("data:image/png;base64,")).toBe(true);
    expect(Buffer.from(png, "base64").length).toBeGreaterThan(0);
  });

  it("refuses a file that is not a deck", async () => {
    await expect(readDeck(await zip({ "word/document.xml": "<doc/>" }))).rejects.toThrow(/PowerPoint/i);
  });
});
