# PDF to Image — migration and parity checklist

Target: standalone React + TypeScript workspace, plain AMOLED black, no imported CTK decorations. Keep the still-active Image Splitter unchanged.

## Original CTK inventory

The working CTK PDF tool spans **two** JavaScript files: `src/js/tools/pdf-to-image.js` and `src/js/presentation/pdf-to-image-presentation.js`. Together they provide:

- Multiple PDF uploads by file picker and drag-and-drop; additional files queue during rendering.
- PNG (default) or JPG format selected at conversion time.
- Automatic page conversion at **2×** PDF page dimensions; JPG quality **0.9**.
- Progress text, completed page counts, and **Cancel Processing**.
- A card and first-page preview for each document, including page counts.
- A detail overlay with page previews and individual page checkboxes (checked by default).
- Select All (Ctrl+A), Download Selected (Ctrl+S), individual page Save.
- Selected ZIP uses `<original filename>_images.zip`, with members `1.png`, `2.png` / `.jpg`.
- Download all uses `pdf-images.zip`: one document has `001.png`, `002.png`; multiple documents use numbered, sanitized document folders.
- Clear with confirmation and Undo; browser-local processing and downloads.

## Migration design

- `PdfToImage.tsx`: input and display, overlay/checkbox state, sequential queue, progress, cancel, selected/all exports, clear with state-preserving undo.
- `renderer.ts`: genuine locally bundled Mozilla PDF.js worker, 2× page rendering, PNG/JPG encoding, cancellation, canvas cleanup, no CDN runtime dependency.
- `engine.ts`: format rules, safe filenames, archive layout, pure unit-tested helpers.
- `pdf-to-image.css`: minimal black UI, usable without the CTK PDF/Image tabs.
- The existing Image Splitter stays a separate React tool. The old CTK compatibility runtime remains for the remaining tools.

## Improvements without removing existing functions

- Clear Undo restores converted blobs and individual checkbox choices, rather than only re-importing original files.
- Duplicate PDF filenames cannot overwrite each other inside the Download All archive.
- Corrupt PDFs show a per-document failure and other queued PDFs can still finish.
- Generated previews, canceled tasks and temporary ZIP URLs are released when no longer needed.
- Opened PDFs are parsed locally, with no third-party CDN worker.

## Automated checks

1. Original CTK regression suite remains green.
2. React + TypeScript production build and PDF.js worker bundling complete.
3. Unit tests confirm formats, 2× scale, names, selection, archive paths.
4. Playwright tests convert actual valid generated PDF documents and inspect ZIP entries, PNG dimensions/pixel colors and JPG bytes; test selected/all export, keyboard shortcuts, clear/undo, malformed PDF, drag-and-drop and cancel.
5. Verify that Logo Resizer and Image Splitter browser tests remain green.

## Review before merging

Still required: manual visual/output comparison against CTK for representative company PDFs (mixed sizes, embedded fonts, transparency, scanned pages, long documents, and real JPG exports), plus large-file memory/cancel behavior on production hardware. Do not call full real-world parity confirmed before this review.
