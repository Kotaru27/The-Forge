# Logo Resizer migration: features and verification

**Status:** React + TypeScript implementation on migration branch, pending real-file browser parity checks. Original CTK remains the reference.

## Fixed requirements
- Output always has a white background; no background selector.
- Presets: 150×150, 200×200 (default), 200×150, 250×250; custom dimensions remain.
- Preserve raster aspect ratio and SVG scalability.
- Keep Pica's original high-quality rendering settings.

## Feature inventory
- [x] Image uploads and drag/drop; multiple files.
- [x] Size confirmation before importing; exact size presets and custom sizes.
- [x] PPTX extraction with slide order, SVG-first and duplicate hashing.
- [x] XLSX/XLSM drawing images, rich-data images and unanchored images.
- [x] Font family, global and individual font size, bold, text color, label-to-filename sync.
- [x] Global and individual padding, image shift, text shift and reset to global.
- [x] Editable filenames, individual labels, card removal and individual download.
- [x] Focus Mode, keyboard arrows and Escape, save/delete.
- [x] White canvas, PNG/JPG and ZIP exports.
- [x] Logo links, S3/Aldi URLs, folder path, one-to-one brand matching, fallback and copy.
- [x] Clear, confirm, and full-state undo.
- [x] Progress and error reporting; duplicate-safe ZIP filenames matching generated links.

## Verification gate before merging
- Logic tests cover preset sizes, path and name handling, matching, output HTML.
- Browser tests cover size/pixel checks, ZIP, editing, undo, Focus Mode, PPTX/XLSX import, link fallback.
- **Not yet proven:** a full set of real PPTX/XLSX/XLSM and SVG files, visual export comparisons against CTK, and large-batch reliability.
- Do not remove the original reference source or merge until the browser suite is green and parity is reviewed.

## Design
Minimal AMOLED black, simple controls, white preview canvas, no decorative CTK elements.
