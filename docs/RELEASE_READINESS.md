# The Forge — release readiness and acceptance

The Forge has a **GitHub Pages preview**, not a production-certified or tagged GitHub Release. This document describes decisions that need proof before creating a formal prerelease.

## Current preview

- Publishing source: `release/pages-preview`, not necessarily `main`.
- [Studio workflow](https://github.com/Kotaru27/The-Forge/blob/release/pages-preview/.github/workflows/studio-pages.yml) may publish **automatically on push**; do not push unreviewed work there.
- [Verified 2026-11-10 preview run](https://github.com/Kotaru27/The-Forge/actions/runs/42862685667) included tests, build, Playwright, Pages deployment and live smoke checks.
- No Windows application, Video Compressor or Filmstrip is included.

## Release gates

- [ ] Select and document an **exact preview commit SHA**.
- [ ] Verify fresh `npm test`, `npm run build` using `FORGE_BASE_PATH=/The-Forge/`, `npm run test:e2e`, Pages publish and live-site smoke test on that commit.
- [ ] Manually inspect all seven routes and representative, non-sensitive exports in supported desktop browsers.
- [ ] Review third-party rights and source attribution in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md), including bundled skills and any test fixtures.
- [ ] Test real Office/PDF/video workloads and authenticated SharePoint permissions and filename collisions; note every incomplete case.
- [ ] Assess dependency reproducibility. Do not add an unverified lockfile or silently upgrade dependencies.
- [ ] Create a clearly labeled **prerelease** pointing to the actual tested preview commit, not an untested `main` revision.
- [ ] Recheck license, CI, release link, exposed assets and any known limitations before submitting sponsorship applications.

## Copy-ready draft GitHub prerelease notes

**Title:** The Forge — seven-tool browser preview

**Body:** A desktop-first React/TypeScript preview with Logo Resizer, PDF to Image, Image Splitter, Video Stills, Storyboard, Link Generator and Ad Downloader. The referenced preview commit has verified automated test/build and live-browser checks. This is not production-certified: large or complex Office/PDF/video files, authenticated SharePoint workflows and some real campaign exports still need manual acceptance. No Windows installer, Video Compressor or Filmstrip is provided.

**Not yet published.** This document does not create a tag, release, download count or deployment. See [parity details](FEATURE_PARITY_GATE.md) and [security audit notes](RELEASE_CODE_AUDIT.md).
