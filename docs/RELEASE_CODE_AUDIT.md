# Release code audit — Logic, safety, migration and browser performance

**Scope:** Exact code at `release/pages-preview` commit `10bb7ac84e2a3301f5febf6136e7218e71e6aa7e` and the focused fixes on `migration/release-code-audit`. We reviewed source-level data flows, runtime cleanup, route boundaries, package/build scripts, key processing modules and existing tests. This is **not** a claim of exhaustive security certification.

## What the repository does

Seven React + TypeScript tools transform locally selected images, documents and video, create ZIP exports, and generate ad campaign scripts and media links. Expected use is a desktop browser processing single campaign batches (tens to hundreds of files) with no backend; external SharePoint downloads use browser permissions.

The review applied the project-local **Ponytail Audit/Review, Sentry Security Review, Vercel React Best Practices, Codebase Design, Systematic Debugging, and Verification Before Completion** checklists.

## Must fix — confirmed and addressed in this branch

1. **Workbook cells could execute code in Forsta exports.** Original: `src/tools/ad-downloader/engine.ts:154-164`.
   - **Case:** A spreadsheet bucket name containing `West')) { hacked(); } if (f('cq42000').any('West` ran injected JavaScript when the copied Forsta script was executed. An AD number could do the same.
   - **Fix:** Escape quote, backslash, control and line separators as string data; flatten comment line breaks. Keep ordinary generated scripts byte-for-byte compatible.
   - **Proof:** The regression test *executed the malicious script* under Node VM and failed before the fix; now it requires zero unauthorized calls.

2. **Unbounded worksheet ranges could freeze the tab.** Original: `src/tools/ad-downloader/engine.ts:73-84, 84-105`.
   - **Case:** Malformed Excel `!ref: A1:XFD1048576` caused nested loops across millions/billions of empty cells. The parser also accepted arbitrarily large input files.
   - **Fix:** Reject files larger than 20 MB before parsing and worksheet dimensions beyond 20,000 rows, 128 columns or 1 million visited cells. Apply to both workbook sheets.

3. **ZIP download safety was per-file, not per-batch.** Original: `src/tools/ad-downloader/assets.ts:33-81`.
   - **Case:** Multiple parallel fetches could each allocate hundreds of MB before checking the shared 350 MB budget.
   - **Fix:** Stream one download at a time and enforce the remaining total byte allowance *while reading*, including responses without a Content-Length. Keep individual downloads and partial ZIP failure reports.

4. **Hostile PDF dimensions could allocate enormous canvases.** Original: `src/tools/pdf-to-image/renderer.ts:54-58`.
   - **Case:** A tiny PDF with a 50,000 × 50,000 page box produced huge 2× render dimensions.
   - **Fix:** Reject a raster page over 8,192 pixels on a side or 32 megapixels, before creating a canvas. Keep the original 2× resolution for normal PDFs.

## Should fix — addressed

5. **Filmstrip launched all media decoders at once.** Original: `src/tools/storyboard/Storyboard.tsx:313-324`.
   - **Case:** Importing hundreds of images could create hundreds of live `Image` / video decoders concurrently.
   - **Fix:** Decode sequentially and preserve the natural file order. Release loaded object URLs if the workspace unmounts mid-import; add a 24-image browser regression case.

6. **Copied bucket tables could contain active spreadsheet formulas or extra rows.** Original: `src/tools/ad-downloader/engine.ts:151-153`.
   - **Case:** A bucket starting with `=HYPERLINK(...)` could be pasted as an Excel formula, and embedded newlines could split a row.
   - **Fix:** Neutralize formula-looking cells, flatten table control characters and quote AD values. Ordinary output remains unchanged.

## Remaining risks / manual acceptance

7. **SharePoint auto-rename still needs real secure Chromium testing.** `src/tools/ad-downloader/auto-name.ts:93-121`: the fallback copy-and-delete implementation cannot guarantee an atomic move if another process creates the same destination filename during the operation. Real folder permission, collision, large-file copy and rename tests are required before production signoff. Do **not** silently overwrite user files or claim this was tested by the mocked API.
8. **Large video and image batches require memory profiling.** `src/tools/video-stills/engine.ts:26-34` can generate up to 86,400 stills per video; `Storyboard` retains decoded image objects. Sequential Filmstrip decoding reduces peak concurrent work but not long-term retention.
9. **Initial bundle still loads all seven tool modules.** `src/App.tsx` statically imports every tool to preserve state and Video Stills ↔ Storyboard transfers; the previous native build measured about 2.62 MB uncompressed. Lazy-loading requires an explicit state/transfer parity design and should not be attempted without browser tests.
10. **Real-work-file parity remains open.** Generated PPTX/XLSM/PDF/WEBM fixtures do not prove authenticated SharePoint downloads, genuine MP4/MOV codecs, large corporate Excel files, or final campaign board exports match CTK exactly.

## Lean and dependency review

No dependency is confirmed unused: React/React DOM, JSZip, Pica, PDF.js, XLSX, TypeScript, Vite and Playwright have actual runtime, compile or test callers. The legacy iframe code was already removed in PR #12; the pinned original CTK still serves as a **test oracle** and is not in deployed assets. This branch intentionally adds validation rather than replacing libraries or introducing architecture layers.

## Verification gates

- Before fixes: a red test run demonstrated **four failing checks** (Forsta injection twice, oversized Excel accepted, and ZIP budget ignored).
- After fixes: the same cases, existing unit suites, original pinned CTK tests, TypeScript build and Playwright must all pass on the **exact head commit**; record fresh run URLs in the PR discussion.
- Additional new checks include large worksheet bounds, ordinary output parity, unsafe TSV copy, oversized PDF input and Filmstrip batch ordering.
- Keep this PR draft and separate from `release/pages-preview` until checks are green and changes reviewed. **Do not deploy** automatically.

## Not checked / known limitations

No user-provided business assets, real authenticated SharePoint directory, actual GitHub Pages live session, memory profiler or Windows-only File System Access setup was available in this review. CSS visual fidelity and Video Compressor are intentionally outside its scope.
