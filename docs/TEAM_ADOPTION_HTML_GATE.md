# Team adoption: standalone HTML feasibility gate

Status: **prototype / not approved for rollout**, 20 November 2026.

## Objective
Evaluate whether The Forge can consolidate two existing internal asset-processing workflows in a simpler, reliable, **offline standalone HTML file**. Deliver the same output quality with fewer manual corrections, not merely a different appearance.

## Baseline and change boundaries
- This branch was created from the Studio preview commit `7f8a764495b01f5da5fa700babaa42dbac029340`.
- Do not modify or publish the existing `release/pages-preview` or `main` branches as part of the initial feasibility work.
- Retain behavior of all seven Forge tools. Leave CTK untouched.
- Do not copy proprietary reference-tool source code or assets. Implement comparable functions independently, subject to internal permissions and license review.

## Staged implementation gates

| Gate | Deliverable | Acceptance |
| --- | --- | --- |
| G1: Inventory | Source-grounded feature matrix and actual-workflow examples | Classify parity as exact, partial, missing or unverified |
| G2: HTML feasibility | Self-contained HTML pilot and measured browser test | Double-click offline; file import, local processing and ZIP/CSV verified in approved browser |
| G3: Office extractor | PPTX/XLSX/DOCX images, caption/row naming, inventory | Match counts and source quality on real, approved Office files |
| G4: Image editing | Margin trim, crop/expand, object split and resize | Correct pixels/dimensions and no unexpected loss |
| G5: Batch naming | Counters, masks, CSV/Excel mappings, collision checks | Deterministic file names with safe duplicates |
| G6: Integration | Guided workflow with advanced options secondary | Reduce user actions and time without more manual fixes |
| G7: Release | Single downloadable HTML build plus controlled hosted preview | Browser test, offline dependency inspection, privacy/IP and regression signoff |

## Feasibility observations
- The Forge production bundle currently references separate JS and CSS assets. One-file delivery needs a dedicated build process and validation of dynamically loaded dependencies/workers.
- Browser storage/rename permissions may not equal Windows EXE privileges; verify in the actual office browser.
- Browser PowerPoint slide rendering is not exact merely because embedded media can be extracted. Use Office-rendered slide exports for workflows requiring exact compositions.
- OCR, PDF, spreadsheet and worker dependencies need explicit offline packaging and license checks.
- A separately delivered, independently developed **image-only** pilot demonstrates a narrow set of capabilities: crop uniform margins, manual crop, canvas resize, filename masks and a local ZIP + CSV. That pilot does not implement Office extraction or comprehensive ImageFlow features.

## Early evidence, not production acceptance
The standalone pilot's inline JavaScript was syntax-checked. Synthetic crop-unit checks passed, and the resulting ZIP was validated with Python `zipfile`, including CRC and UTF-8 name reading. **Browser smoke test not passed:** bundled Chromium failed to produce a DOM result in the test environment; test the file in an approved Windows browser. Neither original executable performance nor exact output parity has been measured.

## Benchmark rule
Run identical, permissioned sample files through both existing tools and Forge. Capture file counts, correctly named items, manual fixes, output pixels, ZIP CRC, duration, user actions, memory usage and offline success. Do not claim superiority until results support it.
