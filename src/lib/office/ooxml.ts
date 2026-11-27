/**
 * Reading an OOXML file in the browser.
 *
 * A .docx, .pptx or .xlsx is a ZIP of XML. Rendering one properly means reading
 * that ZIP and drawing what the XML describes, which is what these modules do —
 * a slide laid out at the author's positions, a sheet with its own column widths
 * and fills. It is the difference between showing somebody their file and showing
 * them the words inside it.
 *
 * Everything here is browser-safe: JSZip inflates the archive and `DOMParser`
 * reads the XML, so there is no Node built-in in sight.
 */
import JSZip from "jszip";

export interface OoxmlArchive {
  /** The text of one part, or null when the file does not contain it. */
  text(path: string): Promise<string | null>;
  /** A part as a data URL, for an image the slide or document references. */
  dataUrl(path: string): Promise<string | null>;
  /** Every path in the archive, so a reader can find slide1…slideN. */
  paths(): string[];
}

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  webp: "image/webp",
  emf: "image/emf",
  wmf: "image/wmf",
};

function mimeFor(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

export async function openOoxml(data: ArrayBuffer | Uint8Array): Promise<OoxmlArchive> {
  const zip = await JSZip.loadAsync(data);
  const names = Object.keys(zip.files);

  return {
    paths: () => names,
    async text(path) {
      // OOXML part names inside relationships are relative and may be absolute.
      const clean = path.replace(/^\/+/, "");
      const file = zip.file(clean) ?? zip.file(clean.replace(/^xl\//, ""));
      if (!file) return null;
      return file.async("string");
    },
    async dataUrl(path) {
      const clean = path.replace(/^\/+/, "");
      const file = zip.file(clean);
      if (!file) return null;
      const base64 = await file.async("base64");
      return `data:${mimeFor(clean)};base64,${base64}`;
    },
  };
}

/* ── XML helpers ───────────────────────────────────────────────────────────── */

export function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

/** `querySelectorAll` with namespaces ignored — the prefixes differ per producer. */
export function all(node: ParentNode, selector: string): Element[] {
  return Array.from(node.querySelectorAll(selector)).filter((element): element is Element => element instanceof Element);
}

/** The first descendant with a local name, whatever namespace prefix it wears. */
export function child(node: ParentNode | null, localName: string): Element | null {
  if (!node) return null;
  for (const candidate of Array.from(node.children)) {
    if (candidate.localName === localName) return candidate;
  }
  return null;
}

export function deep(node: ParentNode | null, ...path: string[]): Element | null {
  if (!node) return null;
  let current: ParentNode | null = node;
  for (const name of path) {
    current = child(current, name);
    if (!current) return null;
  }
  return current instanceof Element ? current : null;
}

export function attr(node: Element | null, ...names: string[]): string | null {
  if (!node) return null;
  for (const name of names) {
    const value = node.getAttribute(name) ?? node.getAttribute(`r:${name}`) ?? node.getAttributeNS(
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      name,
    );
    if (value !== null) return value;
  }
  return null;
}

export function num(node: Element | null, name = "val"): number | null {
  const raw = attr(node, name);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Relationship targets, resolved against the part that owns them.
 * `ppt/slides/_rels/slide1.xml.rels` + `../media/image1.png` → `ppt/media/image1.png`.
 */
export function resolvePath(basePart: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const base = basePart.split("/").slice(0, -1);
  for (const segment of target.split("/")) {
    if (segment === "..") base.pop();
    else if (segment !== "." && segment !== "") base.push(segment);
  }
  return base.join("/");
}

export interface Relationship {
  id: string;
  type: string;
  target: string;
}

export function relsPathFor(part: string): string {
  const segments = part.split("/");
  const name = segments.pop();
  return [...segments, "_rels", `${name}.rels`].join("/");
}

export async function readRels(archive: OoxmlArchive, part: string): Promise<Record<string, Relationship>> {
  const text = await archive.text(relsPathFor(part));
  if (!text) return {};
  const map: Record<string, Relationship> = {};
  for (const element of all(parseXml(text), "Relationship")) {
    const id = element.getAttribute("Id");
    const type = element.getAttribute("Type") ?? "";
    const target = element.getAttribute("Target");
    if (!id || !target) continue;
    map[id] = { id, type, target: resolvePath(part, target) };
  }
  return map;
}
