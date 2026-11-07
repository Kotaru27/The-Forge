# Storyboard migration — Grid Board and Fit to Platform

The Forge now ships **two Storyboard modes**, implemented natively in React and TypeScript.

## Supported

- **Grid Board:** Multi-board management; board creation, renaming, deletion and clearing; per-board 0–3 columns, automatic dimensions, manual output width, gaps, background and cover/contain; frame ordering, previews and JPG/ZIP exports.
- **Imports:** Images/videos, browser folder selection and grouping, natural frame sorting, 200 frames per board, 100 MB per source, visible invalid-file feedback.
- **Fit to Platform:** Three-circle composition at reference size 1033×195, 1×/2×/3× export, automatic text wrapping and clipping prevention, user image upload or current board source, PNG/JPG.
- **Video Stills transfer:** Selected still frames transfer directly into Grid Board; repeated transfers use source/frame identifiers to avoid duplication.

## Deliberately removed

The user requested **complete removal of Filmstrip**. The Filmstrip tab, import/edit state, drawing algorithm, exports, media-picker, board/Filmstrip handoff and Video Stills → Filmstrip action are not part of this release. This is not a hidden UI feature; the associated React logic and types were removed. Historical CTK remains a *test-only* reference and is not bundled in the website.

## Verification

- Unit tests: board column/layout settings, folder grouping and ordering, board names/export paths, still frame identifiers, validation.
- Browser tests: two remaining Storyboard tabs, Grid Board import and JPG/ZIP export, board settings and navigation, Fit to Platform output dimensions/exports, Video Stills → Grid Board (all selected and selected-from-one-video).
- Run Node/CTK regression tests, TypeScript production build, and Chromium Playwright against `/The-Forge/` before release.
- User has verified actual campaign-file and SharePoint workflows separately. Automated tests still serve as reproducible regressions.

No UI redesign or Video Compressor change is included. The release branch remains unchanged until this dedicated PR is verified and approved.
