# The Forge GitHub Pages preview release

**Status checked: 2026-11-11.** The live site is a preview of seven native React tools, **not** a certified production release. A GitHub Actions run on 2026-11-10 successfully built, tested, deployed and smoke-checked the Studio preview.

## Two separate deployment paths

1. **Studio preview publisher:** `.github/workflows/studio-pages.yml` exists on `release/pages-preview` and triggers on pushes to that branch. Its verification job runs tests, build and Playwright before the deploy job; a final job smoke-tests the live site. The latest verified successful run was [Publish The Forge Studio preview](https://github.com/Kotaru27/The-Forge/actions/runs/42862685667). A new push to that branch **can publish**; do not use it for unreviewed changes.
2. **Manual preview publisher:** `.github/workflows/pages.yml` is dispatched manually and rejects refs other than `release/pages-preview`. It also runs tests before deploy and an external browser smoke test afterward. This separate workflow does **not** mean that all preview publishing is manual.

`main` is intentionally retained as a separate baseline and is not necessarily the code displayed by the current Pages preview. Do not merge or reset it merely to update the live site.

## How to review the active preview

- The expected project URL is **https://kotaru27.github.io/The-Forge/**, subject to GitHub Pages configuration and future domain changes.
- Review the exact `release/pages-preview` commit and its [workflow results](https://github.com/Kotaru27/The-Forge/actions) before describing a release as verified.
- Confirm successful `npm test`, `npm run build` with `FORGE_BASE_PATH=/The-Forge/`, `npm run test:e2e`, deploy, and `scripts/smoke-live-pages.mjs`.
- Check actual output ZIPs and image/video exports with representative files; synthetic fixtures are insufficient for full parity.
- A successful deployment or smoke test is evidence of the checked paths only, not guaranteed compatibility with every browser or external service.

## Publishing and rollback safety

Do not push documentation experiments or unverified code directly to `release/pages-preview`: its Studio workflow can auto-deploy. Work in a separate branch and review a PR first. To roll back a preview, identify a previously approved release commit, perform a reviewed branch update or approved revert, and verify the resulting workflow. Do not force-push `main`; never change CTK or the existing published site as part of an unrelated documentation PR.

## Outstanding real-file acceptance

- Actual brand images, large PPTX/XLSX/XLSM documents and complex Storyboard exports
- Scanned/encrypted PDFs, unusually large PDF documents and unusual fonts
- Real MP4/MOV codecs, long videos and Video Stills → **Grid Board** transfers (Filmstrip is retired)
- Authenticated SharePoint download permissions, browser folder permissions, collisions and safe renaming
- Large batches and resource limitations across supported workspaces

These limitations are tracked in [FEATURE_PARITY_GATE.md](FEATURE_PARITY_GATE.md) and [RELEASE_CODE_AUDIT.md](RELEASE_CODE_AUDIT.md). The Windows executable and Video Compressor are out of scope for this web preview.
