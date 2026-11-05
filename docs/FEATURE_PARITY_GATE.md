# Feature parity release gate — seven React tools

**Purpose:** Measure whether the React migration preserves the working CTK behavior. Do **not** treat a successful build, navigation, or synthetic browser fixture as proof that real work files always behave identically.

**Legacy baseline:** CTK at `617615c0b4370c795ddfd6dc4c300920cd595883`. Keep this pinned during parity work. No Video Compressor migration in this release.

## What is checked automatically

| Tool | Automated migration coverage | New parity verification | Still needs real-work files |
|---|---|---|---|
| Link Generator | S3/ALDI, media extensions, unsafe names, output HTML | **Directly execute the pinned CTK generator against 12 inputs** and compare exact output/error behavior | Actual campaign filenames and links |
| Logo Resizer | PNG/JPG/SVG, presets, white background, edit/undo, PPTX/XLSX extracts | OOXML PPTX with SVG-over-PNG fallback, repeated image, numeric slide order; XLSM unanchored media with byte-identical duplicates | Real multi-slide PPTX, XLSM/XLSX with drawing/rich-cell media, company fonts |
| Image Splitter | Nondivisible pixel widths, JPEG/SVG, 50 columns, ZIP naming, 24-image batch | Existing tests retained; remainder-pixel fix is an *approved deviation* from legacy | High-resolution work images and large mixed batches |
| PDF to Image | 2×, PNG/JPG, multiple PDFs, cancel, ZIP order and selections | Valid PDF with 90° rotation; assert width and height in real PNG export | Scanned/image-only PDFs, unusual embedded fonts, huge or encrypted PDFs |
| Video Stills | Uniform JPEG timestamps from sample WebM, ZIP, selected frames, contact sheets | Existing fixture tests retained | Actual MP4/MOV codecs and long videos |
| Storyboard + Filmstrip + Fit | Folder import, board sorting, rendering dimensions, 1–3× exports, frame transfer | Existing browser tests retained | Real campaign boards, multi-hundred images, visual comparisons |
| Ad Downloader | .xls/.xlsx naming, CSV/bucket script, HTTP MIME, SharePoint request handling | Existing unit/browser tests retained | Authenticated SharePoint, folder write/rename in real Chromium, real workbooks |

## Gates before GitHub Pages release

1. **Automated tests:** `npm test` (which runs the pinned CTK reference tests), `npm run build` with `FORGE_BASE_PATH=/The-Forge/`, `npm run test:e2e`. Verify fresh CI logs, counts, zero failures.
2. **Actual originals:** Compare representative work files against the *original* CTK build, including image pixels/dimensions/quality, number and names of ZIP entries, media selection and ordering, and folder/SharePoint behavior.
3. **Cross-tool:** Verify Video Stills to Grid Board/Filmstrip and back; verify navigation retains uploaded data.
4. **Browser:** Secure Chromium with real `showDirectoryPicker` permissions for Ad Downloader. Playwright mocks prove UI logic, not a successful authenticated SharePoint download.
5. **Platform:** Use `/The-Forge/` base and test the actual GitHub Pages URL after approval. No Windows installer during this stage.
6. **Safety:** Run Ponytail Review, security review and a final dependency check. Verify the native-only production artifact contains no CTK runtime; retain the pinned CTK source as a test reference.

## What can honestly be claimed now

- Native React components exist for seven tools and their previous regression suite passes on the integration branch.
- The new tests prove *fixture-based* behaviors and exact CTK Link Generator results.
- **Real customer-file parity has not yet been signed off.** Do not label this release production ready until the missing real-file comparisons are completed.
- This is a draft, stacked migration PR. Do not merge to `main` or deploy without explicit approval.

## Running the parity tests locally

```bash
npm install
npm test
FORGE_BASE_PATH=/The-Forge/ npm run build
npm run test:e2e
```

For Windows PowerShell, use `$env:FORGE_BASE_PATH='/The-Forge/'; npm run build` in place of the Unix-style environment assignment.
