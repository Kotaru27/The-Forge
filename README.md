# The Forge

**Seven creative-production tools. One desktop-first workspace.** The Forge is a React + TypeScript + Vite toolkit for image, PDF, video, storyboard and media-asset workflows.

**[Open the live preview](https://kotaru27.github.io/The-Forge/)** · [How to use it](docs/USER_GUIDE.md) · [View source](https://github.com/Kotaru27/The-Forge)

[![CI](https://github.com/Kotaru27/The-Forge/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Kotaru27/The-Forge/actions/workflows/ci.yml) · [MIT License](LICENSE)

> **Public preview, not a certified production release.** The published Studio UI comes from `release/pages-preview`; `main` remains a distinct development baseline. Manual tests with real Office files, unusual PDFs, video codecs and authenticated SharePoint workflows remain outstanding.

## The seven workspaces

| Workspace | Purpose |
| --- | --- |
| **Logo Resizer** | Batch resize and label images; export PNG/JPG/ZIP |
| **PDF to Image** | Convert PDF pages to PNG/JPG, select pages and export |
| **Image Splitter** | Split images into vertical columns and download ZIPs |
| **Video Stills** | Extract/select video frames and send selected frames to Grid Board |
| **Storyboard** | Assemble Grid Boards or Fit to Platform compositions |
| **Link Generator** | Generate supported media links and output code |
| **Ad Downloader** | Review workbook-listed assets and prepare supported downloads |

The old Filmstrip workflow is retired; Video Compressor and a Windows installer are not included in this release.

## Start using the preview

1. Visit [The Forge](https://kotaru27.github.io/The-Forge/) in a desktop browser.
2. Select a workspace from Home and try a non-confidential sample file.
3. Check the preview, selections and export settings; inspect the downloaded results.
4. Report reproducible problems through the [issue templates](https://github.com/Kotaru27/The-Forge/issues/new/choose).

For format guidance and privacy cautions, see the [user guide](docs/USER_GUIDE.md). Browser-local image/document/video transforms do not imply that external media or SharePoint links are private or accessible without permission.

## Develop locally

Requires **Node.js 22.12.0+**.

```bash
npm install
npm run dev
npm run build
npm run preview
```

For automated checks:

```bash
npm run test:unit
npm run test:e2e
```

`npm test` also runs CTK regression tests against the pinned [CTK](https://github.com/Kotaru27/CTK) commit `617615c0b4370c795ddfd6dc4c300920cd595883` in `legacy-source/` (or `CTK_SOURCE_DIR`). CI prepares this test-only oracle; it is not deployed. Use `npx playwright install chromium` locally if Chromium is missing. Prebuild/predev remove generated ignored legacy files; no npm lockfile is presently committed.

## Engineering evidence and release state

- [CI](https://github.com/Kotaru27/The-Forge/actions/workflows/ci.yml): source tests, original CTK baseline checks and production build; Playwright covers appropriate branches/PRs.
- [Studio preview publisher](https://github.com/Kotaru27/The-Forge/blob/release/pages-preview/.github/workflows/studio-pages.yml): releases the tested preview on **push** to `release/pages-preview`. The [separate manual publisher](.github/workflows/pages.yml) uses explicit dispatch.
- [Release acceptance checklist](docs/RELEASE_READINESS.md): what must happen before a tagged or production release.
- [Public evidence register](docs/OSS_EVIDENCE.md): verified facts and currently unproven adoption.
- [Feature parity matrix](docs/FEATURE_PARITY_GATE.md) and [release code audit](docs/RELEASE_CODE_AUDIT.md): known limits and remaining real-world tests.

The application must **not** be represented as universally compatible with real workbooks, encrypted/scanned PDFs, long MP4/MOV files or authenticated SharePoint folders on the basis of synthetic tests alone.

## Participate and reuse

[Contribution guide](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Changelog](CHANGELOG.md) · [Third-party notices](THIRD_PARTY_NOTICES.md) · [Repository configuration checklist](docs/REPOSITORY_SETTINGS.md)

Original Forge code and documentation are MIT-licensed, © 2026 Kotaru27. Third-party libraries, bundled skills, external sources and fixtures retain their independent terms. The project does not claim unverified active-user, download, dependency or external-contributor counts.
