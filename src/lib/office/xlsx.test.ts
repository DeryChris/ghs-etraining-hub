/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { columnOf, mergeMap, readWorkbook } from "./xlsx";

/**
 * A workbook built here, so the numbers in the test say what the sheet says: a
 * bold header on a fill, a merged cell across two columns, a total wearing a
 * currency and a date stored as a serial.
 */
function zip(parts: Record<string, string>): Promise<Uint8Array> {
  const archive = new JSZip();
  for (const [name, content] of Object.entries(parts)) archive.file(name, content);
  return archive.generateAsync({ type: "uint8array" });
}

const HEADER = `<?xml version="1.0"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts><numFmt numFmtId="164" formatCode="&quot;GH₵&quot;#,##0.00"/></numFmts>
  <fonts>
    <font><sz val="11"/><color rgb="FF101828"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/></font>
  </fonts>
  <fills>
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1F6F5C"/></patternFill></fill>
  </fills>
  <cellXfs>
    <xf numFmtId="0" fontId="0" fillId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0"/>
    <xf numFmtId="14" fontId="0" fillId="0"/>
  </cellXfs>
</styleSheet>`;

const SHEET = `<?xml version="1.0"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="24"/>
    <col min="2" max="2" width="12"/>
  </cols>
  <sheetData>
    <row r="1" ht="20">
      <c r="A1" t="s" s="1"><v>0</v></c>
      <c r="B1" t="inlineStr" s="1"><is><t>Attendance</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>1</v></c>
      <c r="B2"><v>18</v></c>
    </row>
    <row r="3">
      <c r="A3" t="inlineStr"><is><t>Total</t></is></c>
      <c r="B3" s="2"><v>1450.5</v></c>
      <c r="C3" s="3"><v>45000</v></c>
    </row>
  </sheetData>
  <mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells>
</worksheet>`;

function parts() {
  return {
    "xl/workbook.xml": `<?xml version="1.0"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Attendance" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    "xl/sharedStrings.xml": `<?xml version="1.0"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <si><t>Facility</t></si>
  <si><t>Wa East</t></si>
</sst>`,
    "xl/styles.xml": HEADER,
    "xl/worksheets/sheet1.xml": SHEET,
  };
}

describe("readWorkbook", () => {
  it("keeps the sheet's own widths, heights and merges", async () => {
    const workbook = await readWorkbook(await zip(parts()));
    expect(workbook.sheets).toHaveLength(1);

    const sheet = workbook.sheets[0];
    expect(sheet.name).toBe("Attendance");
    expect(sheet.columns[0]).toEqual({ min: 1, max: 1, width: 173 });
    expect(sheet.rows[0].height).toBe(27);
    expect(sheet.merges).toEqual(["A1:B1"]);
    expect(sheet.maxColumn).toBe(3);
  });

  it("reads shared strings, inline strings and numbers, and formats what it can", async () => {
    const sheet = (await readWorkbook(await zip(parts()))).sheets[0];
    const row = (index: number) => sheet.rows.find((entry) => entry.index === index);

    expect(row(1)?.cells.get(1)?.text).toBe("Facility");
    expect(row(1)?.cells.get(2)?.text).toBe("Attendance");
    expect(row(2)?.cells.get(1)?.text).toBe("Wa East");
    expect(row(2)?.cells.get(2)?.text).toBe("18");
    expect(row(2)?.cells.get(2)?.numeric).toBe(true);

    // A currency format code, and a date stored as a serial number.
    expect(row(3)?.cells.get(2)?.text).toBe("GH₵1,450.50");
    expect(row(3)?.cells.get(3)?.text).toBe("15/03/2023");
  });

  it("carries the styling that makes a header a header", async () => {
    const sheet = (await readWorkbook(await zip(parts()))).sheets[0];
    const header = sheet.rows.find((entry) => entry.index === 1)?.cells.get(1);

    expect(header?.style.bold).toBe(true);
    expect(header?.style.fill).toBe("#1f6f5c");
    expect(header?.style.color).toBe("#ffffff");
    expect(header?.style.align).toBe("center");
  });

  it("maps every cell a merge covers, so the renderer draws the anchor once", () => {
    const { anchors, covered } = mergeMap(["A1:B1"]);
    expect(anchors.get("1:1")).toEqual({ rows: 1, columns: 2 });
    expect(covered.has("1:2")).toBe(true);
    expect(covered.has("1:1")).toBe(false);
  });

  it("translates a column reference the way Excel counts them", () => {
    expect(columnOf("A1")).toBe(1);
    expect(columnOf("Z9")).toBe(26);
    expect(columnOf("AA1")).toBe(27);
    expect(columnOf("AB12")).toBe(28);
  });

  it("refuses a file that is not a workbook", async () => {
    await expect(readWorkbook(await zip({ "word/document.xml": "<doc/>" }))).rejects.toThrow(/Excel/i);
  });
});
