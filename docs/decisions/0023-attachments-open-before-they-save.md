# ADR-0023 — An attachment opens; only Download saves it

**Status:** accepted · **Date:** 2026‑11

**Context.** Every attachment on a training was a link straight to a signed
download. A facilitator reads the register on a phone, taps *Support Services*
to see who to call, and the browser saves a file and drops them into a file
manager — the page is gone. A tap on a file almost always means *show me*; it
meant *save this* only because that is all the link could do. The library made it
worse: a single attachment was laid out as a full-width row, which reads like a
section heading with a download bolted on, not like a file you can pick.

**Decision.**

1. **A tile opens a viewer.** Clicking a resource — the tiles under a training,
   the chips on the training page, the grid inside the library panel — opens the
   file in an overlay. Nothing is saved by the click.
2. **Only the Download button downloads.** The overlay's Download button is the
   one place that asks for `?download=1`; the file route answers with
   `Content-Disposition: attachment` only then, and inline otherwise. The overlay
   says so in a line of its own, because a reading view without an exit to the
   original file would be a trap.
3. **One renderer, every format.** `components/materials/file-preview.tsx` draws
   the file for all of PDF, image, video, audio, Word, PowerPoint, Excel and
   plain text, and both the material page and the resource overlay use it. The
   material page is no longer a second implementation that drifts — it is a header
   (open in a tab, download) above the same preview.
4. **The browser renders what it can; the server reads what it cannot.** PDF,
   image, video and audio point their element straight at the file route, which
   streams the bytes with the right content type (and range support, so a
   recording scrubs). Word, PowerPoint, Excel and text are read on the server and
   returned as JSON — blocks, slides, sheets, text — because no browser will draw
   OOXML and a 20 MB deck should not have to be downloaded to be read. A file the
   reader cannot open says so plainly, with the download beside it.
5. **Wide by default, full screen on request.** The viewer opens at the widest
   overlay size (`xl`); a maximise control asks the browser for real full screen on
   the panel (`requestFullscreen`, `.overlay-panel:fullscreen`), so the file gets
   the whole screen and Escape gives it back. `fullscreenchange` is the only truth
   about the state — a denied request and an Escape key arrive the same way.
6. **Attachments are tiles, not rows.** Inside the library panel they sit in a
   two-up grid of compact tiles. A row across the panel is not a file; it is a
   heading.

**Consequences.** (+) A click is reversible, a phone keeps its page, and an
attachment is readable before it is saved. (+) One preview path means a format
added to `FilePreview` works everywhere, including the material page. (−) The
reading view for OOXML is text, not layout — images, fonts and animation live in
the original file, which the overlay links to; that is stated, not hidden. (−)
`NextResponse.redirect` refuses a relative target, so a database-backed store
answers with a plain `Location` header at the same status instead of a redirect
response — the material route and the resource route share that rule.
