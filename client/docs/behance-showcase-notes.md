# Behance project showcase — teardown and how it maps to this site

Sources: Behance Help "Project Cover Image" (official), Behance Help upload FAQ (official), a third-party Behance dimensions guide (Medium), and the live Behance UI as observed. Behance's page could not be opened from the build environment, so the layout rules in the "Observed" column come from knowledge of the UI, not a fresh inspection. Check them against a real project if exact pixels matter.

## 1. What Behance does

| Area | Behance behaviour | Source |
|---|---|---|
| How a project opens | Clicking a card opens the project in an overlay on top of the feed. URL changes, the feed stays underneath, close (X / Esc) returns to the same scroll position. Opening it directly by URL gives a full page. | Observed |
| Page structure | Dark/neutral backdrop → one centred "canvas" (white or author-chosen colour) → header (title, owner, follow/hire) → stack of modules → footer (tags, tools, date, appreciate) → "More by owner". A slim sticky action rail sits beside the canvas on desktop. | Observed |
| Canvas width | Images are authored at **1400 px** (1440 also recommended). Images are shown at their own width up to the canvas width; they are not blown up past their native size. | Third-party guide; observed |
| Modules | Image, text, image grid, video, embed. Stacked vertically, full width of the canvas. Images touch edge to edge; text modules get padding. | Observed |
| Spacing | Author picks the gap between modules (none / small / large). Image stacks are usually seamless. | Observed |
| Background | Author picks the canvas colour. Text colour flips for dark backgrounds. | Observed |
| Cover | Separate from the page content. **Minimum 808 × 632 px, ratio 101:79 (≈1.28:1)**, displayed at 202 × 158 px (so 4× for retina). Author crops it with a slider. Used on grid cards only. | Official |
| File limits | Under 32 megapixels per image; practical advice 500 KB–2 MB (max ~5 MB) per image; JPEG for most art, PNG for text-heavy designs. Height is free (2000–4000 px sections), no fixed aspect ratio. | Official + third-party |
| Loading | Grid → overlay is instant (card data is already there), images lazy-load, details fetch in the background. | Observed |

## 2. What was wrong before here
- Cover rendered up to 82 vh tall, full width. Gallery/images had no size control and could scale up.
- Header, overview, cover and modules all used different widths, so edges did not line up.
- Every project open was a full route change with a spinner.

## 3. What this site does now

| Behance idea | Implementation |
|---|---|
| Overlay over the feed | `ProjectOverlay` route (React Router background-location). Cards pass `state.background`; Esc / X / backdrop click go back. Direct URL → full page with the same `Showcase`. |
| No reload / no spinner | `lib/api.js` keeps an in-memory cache, de-duplicates requests and revalidates in the background (`useApi`). Cards prefetch the project and its cover on hover/focus. The overlay opens instantly using the card's own data while details load. Any admin save clears the cache. |
| 1400 px canvas | `.sc-canvas` max-width 1400. Header, text and about-block share one padding so edges align. |
| Module widths | Each module has a width preset: Full 1400, Wide 1100, Standard 840, Narrow 600, plus left/centre/right alignment. |
| No upscaling | Images use `width:auto; max-width:100%`. Width/height are stored per image so the layout does not jump while loading. Optional "Scale to fit width" per image. |
| Spacing and background | Project settings (stored in a hidden settings block, so the database is unchanged): background colour, module spacing, show cover at top. |
| Cover handling | Cover picker with a focal point (click/drag on the image), live previews in 4:3, 4:5 and 1:1 crops, size readout and a warning under 808 × 632. |
| Text formatting | Rich text module: headings, bold, italic, underline, lists, quote, links, alignment, clear formatting. Pasting is plain text. Output is sanitised on save and again on render. |
| Image size management | Uploads over 2800 px wide are resized in the browser before upload. Multi-file upload / drag-and-drop in the editor creates one image module per file, in order. Warnings for images under 1000 px wide. |
| Action rail, footer, more work | Sticky rail (copy link, start a project, back to top), tags/tools/date footer, previous/next and related projects. |

---

# Update: measurements from the editor and published page screenshots (2026-10-29)

Measured from screenshots (scaled, so about ±2%).

| What | Behance | Implemented here |
|---|---|---|
| Cover | Card preview 458×360 and crop frame 607×475, both ≈1.28:1 = **808×632** | Crop modal with fixed 808:632 frame, drag + zoom, saved as a real 1616×1264 JPEG. Warns if the crop area is under 808×632 |
| Cover card | Image with title, owner, stats on a gradient | Same ratio everywhere (Work grid, "More by"), title/owner on a gradient in the cover preview |
| Page structure | Title/owner strip **above** the canvas; canvas = modules only; cover is not added automatically | Same. `showCover` defaults to off |
| Module gap | Styles → Content Spacing slider, default 2px | Slider 0–80px, default 2px |
| Background | Styles → colour picker or hex | Same, plus 4 swatches; text colour adapts |
| Photo Grid | "Custom" layout: each image keeps its ratio, row images share one height, ~2–3px gap, inset ~77–83% of canvas | `perRow` 1–4, gap 0/2/8/16/32, grid width 100/90/80/60%, optional square crop |
| Text toolbar | Paragraph style, font, size, colour, B/I/U, 3 alignments, link/unlink, clear, text direction | Same (plus lists). RTL toggle for Urdu/Arabic. Sanitiser only keeps colour (hex), size 10–96px, 3 font stacks, `dir` and `text-align` |
| Closing block | Black "Appreciate" block with title, stats, date | Title, published date, "Start a project", custom button, copy link (no likes/views: needs backend) |
| Owner strip | Carousel of the owner's other projects | "More by …" carousel of 808:632 cards with arrows |
| Details | Owner card, tools, creative fields, tags | Owner card + about, tools tiles, category tile, tags (max 10) |
| Right rail | Tools, Save, Share, Boost, Appreciate | Copy link, Contact, Back to top (screens ≥1560px) |
| Editor | Canvas on the left, sticky sidebar (Add Content, Edit Project, Custom Button) | Same: click a module to edit, floating tools, drop images onto the canvas |

Not built (needs backend or is Behance Pro): Lightroom, Prototype, 3D, Attach Assets, Schedule/Password/Link-only, Boost, Appreciate/views, comments, Save.

Storage: all new options live in existing JSON fields. Project styles and the custom button are in the hidden settings block (`divider` with `__settings`). An embed is a `video` block with `content.embed`. Photo grids are `gallery` blocks with `perRow`, `gap`, `gw`.
