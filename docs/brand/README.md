# Brand artwork

| File | What it is | Where it is used |
| --- | --- | --- |
| `ghs-logo-light.svg` | Source hand-over: the official GHS emblem with dark lettering and motto | Source only — kept for traceability |
| `ghs-logo-dark.svg` | Source hand-over: the same emblem with white lettering and motto, for dark surfaces | Source only |
| `public/brand/ghs-emblem-light.png` | 320 px-wide, palette-optimised extraction of the light artwork | `BrandMark` on light surfaces, certificate award |
| `public/brand/ghs-emblem-dark.png` | 320 px-wide, palette-optimised extraction of the dark artwork | `BrandMark` on the dark theme |
| `src/app/icon.png` | 512×512 favicon: light artwork on a white plate | Browser tab, bookmarks |
| `src/app/apple-icon.png` | 180×180 iOS home-screen icon, same plate | iOS "Add to Home Screen" |

## Why the SVGs are not used directly

Both hand-over files are **raster artwork wrapped in an SVG** — a single
`<image xlink:href="data:image/png;base64,…">`. Served as-is they weigh ~1 MB each and gain
nothing from the vector container, so the emblem is extracted once with ImageMagick, trimmed of
its transparent padding, resized to the largest size the UI actually renders (320 px wide covers the
52 px mark at 6× density) and palette-optimised to ~20 KB.

Regenerate after a new hand-over (run from the repository root):

```bash
# extract the embedded PNG from each SVG wrapper
python3 - <<'PY'
import base64, re, pathlib
for theme in ("light", "dark"):
    svg = pathlib.Path(f"docs/brand/ghs-logo-{theme}.svg").read_text()
    data = base64.b64decode(re.sub(r"\s+", "", re.search(r"base64,([A-Za-z0-9+/=\s]+)\"", svg).group(1)))
    pathlib.Path(f"/tmp/ghs-{theme}.png").write_bytes(data)
PY

convert /tmp/ghs-light.png -filter Lanczos -resize 320x -strip -colors 128 -depth 8 \
  -define png:compression-level=9 public/brand/ghs-emblem-light.png
convert /tmp/ghs-dark.png  -filter Lanczos -resize 320x -strip -colors 128 -depth 8 \
  -define png:compression-level=9 public/brand/ghs-emblem-dark.png
convert /tmp/ghs-light.png -filter Lanczos -resize 460x -background white -gravity center \
  -extent 512x512 -strip -colors 128 -depth 8 src/app/icon.png
convert /tmp/ghs-light.png -filter Lanczos -resize 150x -background white -gravity center \
  -extent 180x180 -strip -colors 128 -depth 8 src/app/apple-icon.png
```

## Rules

* The emblem is never redrawn, recoloured or cropped to its initials. Both official variants are used
  as supplied; the theme decides which one shows (`.brand-emblem` in `src/app/globals.css`).
* The mark is always paired with a text wordmark (`GHS-TL`), so the name does not depend on the
  artwork being legible at small sizes.
* Do not add a third variant. If a surface needs a different tone, place the supplied artwork on a
  plate rather than generating new colours.
* If GHS ICT supplies a true vector (.svg/.ai/.eps with paths), replace both PNGs and delete the
  extraction step; nothing else needs to change.

## Provenance

Supplied for this project by Ghana Health Service (brand owner). The emblem, the map of Ghana in the
national flag colours and the motto "Your Health • Our Concern" are GHS identity marks; reproduce them
only in line with GHS brand guidance.
