# The Forge

**The Forge** is a desktop-first creative workroom built with React, TypeScript and Vite. It brings seven existing production-oriented workflows into a single browser interface.

**[Open the GitHub Pages preview](https://kotaru27.github.io/The-Forge/)** · [Browse the preview branch](https://github.com/Kotaru27/The-Forge/tree/release/pages-preview)

> **Project status:** Active public preview, not a production-certified release. Automated checks have passed on the preview branch, but real-work-file acceptance and authenticated SharePoint checks remain outstanding. No Windows executable is provided.

## What is included

| Workspace | Purpose |
| --- | --- |
| Logo Resizer | Prepare and batch-export logos using size presets and labels |
| PDF to Image | Convert selected PDF pages to PNG/JPG outputs |
| Image Splitter | Split images into pieces with ZIP export |
| Video Stills | Extract, review, select and export video frames |
| Storyboard | Arrange assets in Grid Board or Fit to Platform layouts |
| Link Generator | Generate media links and associated code |
| Ad Downloader | Review advertising assets and prepare supported downloads |

Video Compressor and Filmstrip are **not** part of this seven-tool build. The browser-local workflows and their exports are subject to browser and file-format limitations; external asset and SharePoint requests depend on the user's existing permissions and network policies.

## Current branches and preview

- `main` is the intentionally preserved development baseline, **not necessarily the version shown on the live Pages preview**.
- `release/pages-preview` contains the current Studio preview and its visual changes. Its `.github/workflows/studio-pages.yml` workflow publishes that preview on pushes to the release branch **after** tests and build checks succeed.
- `.github/workflows/pages.yml` is a **separate manual** preview deployment workflow. Do not assume all publishing is manual.

See [the release and rollback procedure](docs/GITHUB_PAGES_RELEASE.md) and [feature parity acceptance gate](docs/FEATURE_PARITY_GATE.md). Neither a passing automated workflow nor a working preview establishes parity for every real campaign file.

## Develop locally

Requires Node.js **22.12.0 or later**.

```bash
npm install
npm run dev
npm run build
npm run preview
```

The `predev` and `prebuild` commands remove previously generated, ignored `public/legacy` content. The production build checks that legacy CTK runtime and Video Compressor payloads are not bundled.

## Verification

```bash
npm run test:unit
npm run build
npm run test:e2e
```

`npm test` additionally runs the original CTK regression suite. For it, check out [Kotaru27/CTK](https://github.com/Kotaru27/CTK) at commit `617615c0b4370c795ddfd6dc4c300920cd595883` into `legacy-source/`, or set `CTK_SOURCE_DIR` to that checkout. CI prepares the test-only baseline automatically. CTK is **not** shipped as a runtime dependency.

The browser suite uses Playwright; install Chromium if it is not available locally with `npx playwright install chromium`. The current project does not commit an npm lockfile; dependency resolution is not yet pinned end to end.

## Known verification limits

Automated tests cover fixture-based imports, transforms, exports, interaction flows and selected legacy-output comparisons. Separate manual acceptance is still required for real multi-slide Office files, scanned/encrypted PDFs, MP4/MOV combinations, large asset batches, and authenticated SharePoint/file-system permissions. See [feature parity](docs/FEATURE_PARITY_GATE.md) and [release code audit](docs/RELEASE_CODE_AUDIT.md).

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) for scoped contribution and testing guidance. For vulnerabilities, read [SECURITY.md](SECURITY.md); do not publish exploit details in issues.

## Licensing and third-party sources

**Project-wide open-source licensing is pending an ownership and redistribution-rights review.** Public availability of this source is not, by itself, permission to copy or redistribute it under an assumed license. Do not treat the license files bundled with individual agent skills as a license for The Forge itself.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the dependency inventory, bundled skill provenance and outstanding ownership checks. A project-level LICENSE will be added only after the applicable rights are confirmed.
