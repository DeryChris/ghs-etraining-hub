# ADR-0024 — The file is drawn, not described

**Status:** accepted · **Date:** 2026‑11 · **Supersedes** the reading-view part of ADR‑0023

**Context.** The viewer was honest but wrong. A .pptx opened as a list of slide
text; a .docx as headings and paragraphs; an .xlsx as a table of values. Every
word was there and none of the document was: the title sat where the paragraph
order put it rather than where the author dragged it, the accent band was gone,
the picture was gone, the column that was four times wider was the same width as
its neighbour. A facilitator who had spent an afternoon on a deck opened it in
the library and did not recognise it — and asked, reasonably, for the file to
look like the file, the way PowerPoint, Word and Acrobat show it.

**Decision.**

1. **Each format is drawn by the best renderer available to a browser.**
   PDF goes through the browser's own engine. Images, video and audio are native
   elements. Word is drawn by `docx-preview`, which produces Word's page layout —
   margins, headings, tables, images, headers and footers. PowerPoint and Excel
   are drawn by readers in `src/lib/office/`, which turn the OOXML into a model
   and render it: every slide shape at its own EMU position with its own size,
   colour and picture; every sheet as a grid with its own widths, merges, fills,
   and number formats.
2. **The browser does the reading, at the moment of reading.** Nothing is parsed
   on the server for the viewer any more. The old path read the object on the
   server and shipped text into the page; that made opening a deck cost the page
   the whole file, and it could only ever produce text. The bytes now come from
   the same file route the download uses, which applies the same authorisation.
3. **The model is plain data, so it can be tested.** `pptx.ts` and `xlsx.ts`
   return slides, shapes, runs, sheets and cells — no React, no DOM. They are
   unit-tested against packages built in the test itself, so a position, a font
   size, a merge or a currency format is asserted rather than eyeballed.
4. **What cannot be drawn is said, not hidden.** Animation, SmartArt, gradients,
   charts and effect fills are not rendered; a deck with a chart says so under the
   slides. A file the readers cannot open shows a plain message with the download
   beside it, never an empty frame — and the original is always one click away.
5. **A wrong upload can be replaced where it was discovered.** Opening a file is
   how a wrong file is found, so the viewer carries "Replace file" for whoever
   may edit the training: drop the right file, the row keeps its place and its
   history, and the old object is deleted only after the new one is recorded.
6. **A file that will not open can be reported without describing it again.**
   The viewer links to the complaint form with the issue and the training already
   filled in (ADR‑0025).

**Consequences.** (+) The library shows the document the facilitator made, and a
learner on a phone can read a deck without downloading it or installing anything.
(+) Two readers with tests instead of one server reader with none. (+) The
material page no longer reads a 25 MB object to render its first page.
(−) `docx-preview` and `jszip` are client dependencies (about 200 KB gzipped,
loaded only when an office file is opened, in a separate chunk). (−) The .pptx and
.xlsx readers cover what a training actually contains and not the whole OOXML
specification; the gap is stated in the UI and closed by the download.
