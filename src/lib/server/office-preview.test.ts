import { describe, expect, it, vi } from "vitest";

// The reader is server-only; the guard has nothing to say about a test process.
vi.mock("server-only", () => ({}));

import { readOfficePreview } from "./office-preview";

/**
 * Fixtures are built here rather than committed as binaries: a stored-mode ZIP is
 * a few dozen bytes of header per entry, and writing it in the test keeps the
 * reader honest about the format instead of about one particular file.
 */
function makeZip(files: { name: string; content: string }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const body = Buffer.from(file.content, "utf8");

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(0, 14); // crc — not read by the parser
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10); // stored
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(body.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += 30 + name.length + body.length;
  }

  const centralStart = offset;
  const centralBytes = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBytes.length, 12);
  eocd.writeUInt32LE(centralStart, 16);

  return Buffer.concat([...locals, centralBytes, eocd]);
}

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

describe("readOfficePreview", () => {
  it("reads paragraphs, headings and bullets out of a Word document", () => {
    const xml = `<?xml version="1.0"?>
      <w:document><w:body>
        <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Standard precautions</w:t></w:r></w:p>
        <w:p><w:r><w:t>Wash hands </w:t></w:r><w:r><w:t>before contact.</w:t></w:r></w:p>
        <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>PPE order &amp; removal</w:t></w:r></w:p>
      </w:body></w:document>`;
    const preview = readOfficePreview(makeZip([{ name: "word/document.xml", content: xml }]), DOCX);

    expect(preview.kind).toBe("docx");
    expect(preview.blocks).toEqual([
      { kind: "heading", text: "Standard precautions" },
      // Runs inside one paragraph are one sentence, not two.
      { kind: "paragraph", text: "Wash hands before contact." },
      { kind: "bullet", text: "PPE order & removal" },
    ]);
  });

  it("numbers slides in order even when the archive lists them out of order", () => {
    const slide = (text: string) => `<p:sld><p:cSld><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:cSld></p:sld>`;
    const zip = makeZip([
      { name: "ppt/slides/slide10.xml", content: slide("Tenth") },
      { name: "ppt/slides/slide2.xml", content: slide("Second") },
      { name: "ppt/slides/slide1.xml", content: slide("First") },
    ]);
    const preview = readOfficePreview(zip, PPTX);

    expect(preview.slides?.map((s) => [s.number, s.lines[0]])).toEqual([
      [1, "First"],
      [2, "Second"],
      [3, "Tenth"],
    ]);
  });

  it("reads a spreadsheet through the shared-string table", () => {
    const strings = `<sst><si><t>Facility</t></si><si><t>Attended</t></si><si><t>Jirapa</t></si></sst>`;
    const sheet = `<worksheet><sheetData>
        <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
        <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>18</v></c></row>
      </sheetData></worksheet>`;
    const workbook = `<workbook><sheets><sheet name="Attendance"/></sheets></workbook>`;

    const preview = readOfficePreview(
      makeZip([
        { name: "xl/workbook.xml", content: workbook },
        { name: "xl/sharedStrings.xml", content: strings },
        { name: "xl/worksheets/sheet1.xml", content: sheet },
      ]),
      XLSX,
    );

    expect(preview.sheets?.[0].name).toBe("Attendance");
    expect(preview.sheets?.[0].rows).toEqual([
      ["Facility", "Attended"],
      ["Jirapa", "18"],
    ]);
  });

  it("refuses a file that is not an archive instead of rendering nothing", () => {
    expect(() => readOfficePreview(Buffer.from("not a zip at all"), DOCX)).toThrow(/archive/i);
  });
});
