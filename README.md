# The Forge — native React web release candidate

The Forge is a desktop-first, AMOLED-black **React + TypeScript + Vite** toolkit. The initial GitHub Pages web release contains **seven tools**: Logo Resizer, PDF to Image, Image Splitter, Video Stills, Storyboard (Grid Board / Filmstrip / Fit), Link Generator and Ad Downloader.

**Video Compressor is postponed** and will be rebuilt from scratch after the website is stable. Its old CTK iframe, compression worker and bundled legacy CSS/JS are not part of this web build.

## Develop locally

Prerequisite: Node.js >= 22.12.0. For building or developing the seven native tools, no CTK checkout is needed.

```bash
npm install
npm run dev
npm run build
npm run preview
```

The `predev` / `prebuild` commands remove any previously **generated, ignored** `public/legacy` directory before Vite runs, so old CTK assets cannot accidentally re-enter the build. The post-build check verifies the bundled entrypoint and blocks legacy/compressor payloads.

## Automated verification

```bash
npm run test:unit
npm run test:e2e
```

`npm test` runs **both** the React/TypeScript unit tests and the original CTK baseline regression tests. For the latter, check out `Kotaru27/CTK` at pinned commit `617615c0b4370c795ddfd6dc4c300920cd595883` into `legacy-source/`, or set `CTK_SOURCE_DIR` to an equivalent local checkout. GitHub Actions does this automatically. **CTK remains a test oracle, not an app/runtime dependency.**

## GitHub Pages release candidate

The seven-tool React site is prepared for a **manual, gated** GitHub Pages preview from `release/pages-preview`. The source branch runs build and browser checks without automatically publishing. After enabling GitHub Pages (Settings → Pages → GitHub Actions), use the Actions workflow's branch dropdown to deploy only the reviewed release branch, then inspect the live URL.

See [GitHub Pages release procedure](docs/GITHUB_PAGES_RELEASE.md) for the one-time setting, deployment instructions, live Chromium smoke checks, rollback, and remaining real-file acceptance checks.

## GitHub Pages

The project site URL base is `/The-Forge/`. On Linux/macOS:

```bash
FORGE_BASE_PATH=/The-Forge/ npm run build
```

On Windows PowerShell:

```powershell
$env:FORGE_BASE_PATH = '/The-Forge/'
npm run build
```

The build fails if the produced script does not use that base path, or if `dist/` includes any `legacy/` or `compressor/` folder. The Playwright suite runs against the same production-style path.

`.github/workflows/pages.yml` supports **manual deployment only**. Publishing is not part of the migration PRs and requires approval and Pages configuration (Settings → Pages → GitHub Actions).

## Feature parity status

The React implementations have automated tests for uploads, transforms, ZIP/image exports, cancel/undo, keyboard controls and Video Stills → Storyboard/Filmstrip transfers. Additional tests compare exact Link Generator output against pinned CTK and validate OOXML and rotated PDF edge cases.

**Real-work-file parity is still a release gate.** See [feature parity gate](docs/FEATURE_PARITY_GATE.md), [native runtime cleanup](docs/NATIVE_WEB_CLEANUP.md) and individual migration notes under `docs/`. Authentic SharePoint permissions, real Excel/PPTX files and MP4/MOV compatibility must be verified before calling the website production-ready.

No native Windows executable is included.
