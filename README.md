# The Forge — React migration

**Phase 1: functional compatibility foundation**, not the Windows installer. React + TypeScript + Vite own the application shell; the eight existing CTK engines stay in an isolated compatibility workspace while they are migrated tool by tool. The UI is deliberately minimal and AMOLED black. No imported intro, extra homepage elements, animations, or unrelated features.

## Work locally

Prerequisites: Node.js 22.12+ and Git. The first setup fetches the **pinned CTK commit** into a local ignored directory; GitHub CI does the same. To use a local CTK source folder instead, set `CTK_SOURCE_DIR` to its absolute path.

```bash
npm install
npm run dev
```

`npm run build` generates production assets, and `npm run test` runs bridge checks plus the original CTK regression tests. `public/legacy` is generated; don't hand-edit it. This first phase intentionally retains the original processing algorithms and some classic DOM dependencies. No native Windows APIs or updater yet.

## Migration boundaries

- React owns navigation, top-level layout, state and future tool components.
- The compatibility iframe runs the pinned existing CTK logic, with its legacy navigation and decorative homepage hidden.
- Processed local files remain in the browser, not uploaded to GitHub.
- Before replacing any tool, add golden output fixtures and browser end-to-end tests, then migrate its logic into typed services.
- Do not remove the compatibility bridge until all tool flows and the video compressor are verified.

## Deployment

`FORGE_BASE_PATH=/The-Forge/ npm run build` for GitHub Pages project URLs. GitHub Pages must be configured with **Settings → Pages → GitHub Actions** before deployment can occur. Keep the working CTK deployment separate during migration.

Logo Resizer migration checklist and E2E coverage are documented in `docs/LOGO_RESIZER_MIGRATION.md`. The new Logo Resizer is being tested on a separate branch; full functional parity is not claimed until representative real-file browser tests pass.

## Image Splitter migration

The new Image Splitter is a React + TypeScript tool with whole-pixel cuts and matching numbered ZIP export behavior. It is staged separately from the original PDF to Image tool and from production. See `docs/IMAGE_SPLITTER_MIGRATION.md` and `e2e/image-splitter.spec.ts`. Full real-file parity and large-batch checks are required before merging.

## Video Stills migration

Video Stills runs natively in React + TypeScript. The temporary same-origin bridge keeps its Send to Board and Send to Filmstrip actions connected to the existing Storyboard/Filmstrip engine. See `docs/VIDEO_STILLS_MIGRATION.md`. Tests use a small local WebM fixture; video and image data never leave the browser.
