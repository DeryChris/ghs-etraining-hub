/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { renderAsync } from "docx-preview";

function docx(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="xml" ContentType="application/xml"/>
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Referral pathway</w:t></w:r></w:p>
        <w:p><w:r><w:t>All referral letters go to the district team within 24 hours.</w:t></w:r></w:p>
        <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Facility</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
      </w:body></w:document>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}

describe("docx-preview", () => {
  it("renders a document into page wrappers with its text and table", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    await renderAsync(await docx(), host, host, { inWrapper: true, breakPages: true });

    expect(host.textContent).toContain("Referral pathway");
    expect(host.querySelector("table")).not.toBeNull();
    expect(host.querySelector(".docx-wrapper")).not.toBeNull();
  });
});
