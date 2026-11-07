# Video Stills — React + TypeScript migration

The native Video Stills tool preserves bulk video upload, sequential frame extraction, optional contact sheets, per-video review, frame selection, ZIP downloads, cancel and clear controls, and browser-local processing.

## Current Storyboard transfer

- **Send to Board** from the main toolbar transfers selected frames from all video collections.
- **Send to Board** in an open video collection transfers only the checked frames for that video.
- The destination is the native Storyboard **Grid Board**. The transfer preserves existing project grouping, avoids duplicate frames using collection and frame numbers, and opens the Grid Board after a successful transfer.
- **Filmstrip has been retired by request.** The old Filmstrip action, transfer destination and related bridge code have been removed.

## Verification

Node tests validate sampling cadence, selected frame naming and safe ZIP layouts. Browser tests validate actual sample WebM decoding, downloads, keyboard navigation, selected-frame transfers to Grid Board and persistence when navigating away.

All processing occurs locally in the user's browser. The pinned original CTK repository is still used only as a regression test reference, not as part of the deployed application.
