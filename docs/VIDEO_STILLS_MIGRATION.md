# Video Stills — React + TypeScript migration

## Scope and original behavior

- Batch upload and drag/drop video files; process sequentially without uploading to a server.
- Preserve deterministic extraction: `Math.floor(duration)` equally spaced full-resolution JPEGs, quality 0.9 (one per completed second).
- Keep optional contact sheet (4, 6, or 9 input frames, white background, JPEG quality 0.95); original UI kept this setting hidden/disabled, but the processing contract still exists.
- Keep each video collection, clickable review/contact sheet, individual frame selection, select all, arrow-key preview and Escape to close.
- Keep `name_stills.zip` for selected frames and `video_extras.zip` for all collections; each video gets its own ZIP directory and still images remain sequentially numbered.
- Keep clear confirmation, cancel active processing, prevent missing/duplicate ZIP names, and release temporary media/object URLs.
- The `Send to Board` action should create a separate storyboard per source video and only transfer checked frames; repeated imports should not duplicate frames.
- The `Send to Filmstrip` action should transfer checked frames from the active video to the pre-existing Filmstrip functionality.

## Implementation boundary

- New UI is AMOLED black with only functional controls; React + TypeScript own video decoding, per-file frame state and ZIP exports.
- `scripts/legacy-stills-transfer.js` runs in the pinned CTK compatibility iframe to use the original Storyboard/Filmstrip internals until Storyboard is migrated.
- The transfer bridge passes local Blobs over same-origin `postMessage`. It does not upload user videos/stills to GitHub, external services or a server.
- Storyboard code is not rewritten in this PR; PDF to Image, Image Splitter, Logo Resizer, and Link Generator remain unchanged.

## Verification

- Unit tests validate frame cadence, selected frame handling, safe ZIP contents, and naming behavior.
- Browser tests use an actual VP8 WebM fixture to validate extraction, JPEG dimensions and ZIP contents, optional contact sheets, keyboard selection, cancellation/clear, navigation persistence, and both cross-tool transfers.
- This migration remains a draft PR pending comparison with actual working videos of differing codecs, long recordings, and real storyboards.
