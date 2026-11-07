# Ponytail cleanup — safe first pass

Scope: The Forge React migration, based on `migration/video-stills`. This cleanup does **not** remove the original CTK runtime, change export formats, or migrate the remaining tools.

## Verified reductions
- Remove unused `LogoEdits` type (the migrated source does not reference it).
- Replace three repeated checks of five migrated tool IDs with the `usesLegacyWorkspace` helper, keeping the same navigation and Storyboard hand-off behavior.
- Replace repeated browser download-link code in Logo Resizer, PDF to Image, Image Splitter and Video Stills with one helper using the same 60-second cleanup delay. PDF and Video Stills still track download URLs for unmount cleanup.
- Add regression tests for the legacy route split and download-link cleanup.
- No libraries are removed: all current packages remain in use.

## Deferred on purpose
- The pinned CTK compatibility build continues supporting Storyboard, Ad Downloader and Video Compressor. The old CTK scripts and CSS must not be deleted until those workflows are independently migrated and tested.
- Additional cross-tool ZIP helpers may be shared later, but each tool currently has slightly different progress and naming behavior; no speculative refactor now.
- Before release, compare real work assets and run the full original and new browser tests.

## Decision
Make this a **draft, stacked pull request** onto `migration/video-stills`. Never rewrite or force-push working `main` for cleanup.
