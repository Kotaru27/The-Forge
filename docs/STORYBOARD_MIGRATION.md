# Storyboard (Grid Board, Filmstrip, Fit to Platform) migration

React + TypeScript replacement for the three connected CTK workspaces. This is intentionally a small desktop-oriented AMOLED-black interface, with the same processing features.

## Original features mapped

- Grid Board: 0–3 columns, auto 4 frames = 2×2, incomplete final row centered, adaptive output width, manual width 64–8192, background, gap, cover/contain, JPG exports and bulk `boards.zip`.
- Board manager: multiple boards, compact/list switch, board rename, duplicate-safe names, add/delete/clear with confirmation, per-board settings, move/remove individual frames.
- Imports: images and videos, one screenshot per video, folder picker (`webkitdirectory`), one board per subfolder, natural frame ordering, 200 frames/board, 100 MB/source limit, rejected-file notices.
- Filmstrip: auto distribution, 1–5 rows, 2–6 frames per row, sort, reorder/remove, JPEG/PNG exports, file imports including videos, current-board handoff and reverse handoff, advanced settings retained.
- Fit to Platform: reference geometry (1033×195), 1×/2×/3× export, three circles with image and text, automatic wrapping and clipping prevention, uploaded image or current board, reset controls, PNG/JPG exports.
- Video Stills: collection-per-board handoff, frame duplicate detection, chosen frames to Filmstrip, stay in React without relying on the old Storyboard iframe.

## Design and known limits

- AMOLED black interface, no imported CTK homepage, fancy transitions or decorative elements.
- Old Storyboard and Filmstrip engines remain in the ignored, pinned CTK compatibility workspace while Ad Downloader and Video Compressor continue to use it. Do not remove the CTK build until those tools are migrated and regression tested.
- Browser decode support for formats depends on browser/OS codecs (same limit as old app). Video screenshot seeks to up to 1 second within the 15-second timeout.
- Files stay in the user's browser. No server upload.
- Very large canvas exports can be limited by the browser. Empty and failed exports are reported rather than saved as blank files.

## Test plan

- Unit: auto/manual column layout; folder ordering; unique board and ZIP names; filmstrip distribution; repeated still transfers; file validation.
- Browser: import/preview/export; rename/settings/reorder; multi-board ZIP; clear/delete confirmation; folder grouping; Filmstrip exports; Fit geometry and long-text handling; preserve state when navigating; Video Stills transfer regressions.
- Manual parity gate before merging: compare output JPG/PNG dimensions, layout and actual pixels on real campaign images/videos and nested folder imports against original CTK, including large batches and unusual image aspect ratios.

This feature is proposed as a stacked draft PR; the working main branch stays untouched until parity is approved.
