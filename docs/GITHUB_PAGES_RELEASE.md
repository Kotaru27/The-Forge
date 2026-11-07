# GitHub Pages preview release — controlled rollout

The Forge's initial web release is **seven native React tools**. Video Compressor is excluded and will be built from scratch later. This is a **preview release** until real campaign files and authenticated SharePoint flows have passed manual acceptance.

## Current prerequisite: enable GitHub Pages once

The GitHub repository's `has_pages` flag reported `false` during preparation on **2026-11-05**. Without an enabled Pages site, `actions/configure-pages@v5` will fail before publishing.

An administrator must perform this setting using GitHub's UI:

1. Open [The Forge repository Settings → Pages](https://github.com/Kotaru27/The-Forge/settings/pages).
2. Under **Build and deployment**, select **GitHub Actions** as Source.
3. Save, then verify the GitHub Pages site is enabled.

This setting **cannot be enabled with the workflow's default `GITHUB_TOKEN`**. Do **not** add a personal access token or administrator secret to the workflow as a workaround. Use the one-time Settings UI.

## Prepare the release candidate without changing main

The reviewed migration is stacked in GitHub PRs. `main` is intentionally preserved until production acceptance.

1. Ensure the build and test jobs are green on `migration/pages-release-prep`.
2. Create the isolated `release/pages-preview` branch from the **approved exact commit**, not `main`.
3. The release branch runs CI automatically (unit tests, original CTK tests, a native-only production build, 55+ Chromium browser tests). On success, Actions stores a **the-forge-pages-preview** production artifact for review. This does **not** publish the website.
4. Review PR changes and [feature parity gate](FEATURE_PARITY_GATE.md) for unresolved real-work-file checks before representing the site as production-ready.

## Publish the preview after enabling Pages

1. Go to [GitHub Actions → Publish The Forge GitHub Pages preview](https://github.com/Kotaru27/The-Forge/actions/workflows/pages.yml).
2. Select **Run workflow** and explicitly choose `release/pages-preview` from the **Branch** dropdown.
3. Run the workflow. Its first step **rejects any other ref**, including `main`. The verify job builds with `FORGE_BASE_PATH=/The-Forge/`, runs Node + pinned CTK regression tests, then full Playwright. Only after all pass does the Pages deployment job publish the artifact.
4. The final job runs `scripts/smoke-live-pages.mjs` in Chromium **against the actual URL returned by GitHub Pages**. It verifies seven routes, script URLs/MIME, a generated link, an image upload plus ZIP export, invalid-link fallback, and no iframe or runtime errors.
5. Open **https://kotaru27.github.io/The-Forge/** and manually check the toolset on desktop. If the account uses a custom domain, use the URL reported by the deployment job instead.

If the workflow is unavailable from Actions until a default-branch workflow exists, verify `.github/workflows/pages.yml` is registered on `main` and use its **Branch** selector. Never accidentally publish the starter `main` branch.

## Rollback

This is a preview branch with a manual deploy trigger, not an automatic production release. To revert a release, restore the previously approved release commit on `release/pages-preview`, let CI run again, then invoke the same Pages workflow from that branch. Do not force-push `main` or alter the CTK repository.

## Release blockers still open

The successful automated suites use generated OOXML/PDF test fixtures and sample WebM. Before declaring a full production release, manually test:
- genuine campaign logos and large PowerPoint/Excel documents;
- scanned, encrypted and high-page-count PDFs;
- MP4/MOV codecs, long videos, and Video Stills → Storyboard/Filmstrip transfers;
- full Storyboard exports with actual campaign images;
- authenticated SharePoint downloads, folder picker permissions and file renaming in a secure Chromium session.

The local browser's file and canvas processing is not a guarantee that external SharePoint permissions or remote file CORS policies are valid.
