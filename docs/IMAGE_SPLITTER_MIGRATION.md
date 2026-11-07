# Image Splitter migration checklist

Target: React + TypeScript component, in a minimal black (#000) workspace. A standalone tool, without changing the existing PDF to Image logic or route.

## Original CTK feature inventory

- Upload multiple images using file picker or drop.
- Add more images in the original order; original previews, filename and status per image.
- Each image checked by default; choose per-image whether it is split or exported whole.
- Columns 1–50, default 2. Exactly one horizontal row; preview shows vertical dividers.
- No automatic processing when a file, check or column changes; explicit **Split Images** action.
- Download all included parts and unchanged source images as a numbered ZIP named `split_images.zip`.
- Clear with confirmation and Undo.
- All image processing happens locally in the browser.
- Share an outer CTK PDF tab, but processing and state are independent.

## Improvements implemented without altering core workflow

- Whole pixel boundaries retain remainder columns; previously fractional canvas widths lost/blurred pixels.
- Changing columns invalidates previous pieces to avoid exporting stale cuts.
- Unsupported canvas encoding types (SVG/GIF/BMP) use correctly named PNG pieces; unsplit originals keep their original bytes.
- Clear Undo restores selected flags, chosen column count and already split pieces.
- Error status for corrupt images or too many columns for a narrow image.
- ZIP progress, processing progress and release of temporary image URLs.
- Minimal AMOLED-black interface, no old decorative CTK elements.

## Testing gates

1. Original CTK Node tests pass.
2. New TypeScript unit tests cover slice boundaries, range, zip planning and MIME/extension choice.
3. Playwright tests verify real PNG dimensions and pixels from ZIP, multi-image selection, clear/undo, SVG, duplicate upload, narrow-image error.
4. Compare real-work images and large batches against CTK before claiming full behavioral parity.
5. The old PDF to Image stays in the compatibility runtime throughout this migration.

This work is intentionally staged on a separate branch. Do not merge until baseline parity is verified.
