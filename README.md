# The Forge — React + TypeScript migration

Phase 1 is the compatibility foundation. React and TypeScript own the application shell while existing CTK engines continue to run in an isolated workspace. All eight tool routes remain available. The UI is deliberately basic: AMOLED black, one sidebar, one title, no decorative CTK homepage, intro, or extra widgets.

This is not yet a full TypeScript rewrite of processing engines, a Windows executable, or a Tauri updater.

## Local development

Requirements: Node.js 22.12+, Git and npm.

Install dependencies with `npm install`, then run `npm run dev`. The first setup fetches a pinned, public CTK baseline, or set the CTK_SOURCE_DIR environment variable to a local copy of the uploaded CTK source.

Commands:
- `npm run prepare:legacy` generates a local compatibility workspace.
- `npm test` runs bridge checks and original CTK regression tests.
- `npm run build` produces a Vite application build.

The generator copies the original tested engine into ignored public/legacy and hides the legacy homepage and navigation while preserving tool controls. React navigates through a typed, origin-checked message bridge. The compatibility source remains pinned to commit 617615c0b4370c795ddfd6dc4c300920cd595883 of Kotaru27/CTK until each engine is migrated.

This is a static client-side app. Do not treat the public site as access-controlled or upload confidential files there.

## Migration order

1. Record baseline outputs and browser workflows for every tool.
2. Move the shared shell and navigational state into React (started).
3. Migrate Link Generator and Logo Resizer into typed services and components.
4. Migrate Image Splitter, PDF to Image, Video Stills and Ad Downloader.
5. Migrate Storyboard and Video Compressor after output comparison.
6. Remove the compatibility bridge when all workflows pass regression tests.
7. Only then integrate Tauri 2, Windows packaging and GitHub-based updates.

## GitHub Pages

The preview workflow is manually triggered to prevent publishing an unverified migration. Configure Settings → Pages → GitHub Actions and run the Publish web preview workflow after verification. Vite uses FORGE_BASE_PATH=/The-Forge/.

Automated bridge checks do not establish full functional parity. Browser-based workflows and generated file outputs must still be tested.
