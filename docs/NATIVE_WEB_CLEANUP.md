# Seven-tool native web cleanup

## What is being retired from the web payload

All seven GitHub Pages routes are now backed by React components, and Video Compressor is deliberately postponed. The prior bridge never initializes for the seven release routes.

This dedicated cleanup removes the *web runtime*, not the baseline repository:
- Remove `LegacyWorkspace.tsx`, `stills-transfer.ts`, the injected iframe transfer script and the legacy materializer.
- Remove the legacy/compressor route metadata and iframe CSS.
- Build Vite directly without copying the pinned CTK page, CSS, JavaScript, images, or compressor into `dist/`.
- Remove **only generated, ignored `public/legacy` output** before development builds, preventing older installations from leaking obsolete payloads into releases.
- Verify the built directory has no `legacy/` or `compressor/`, and that the hashed Vite entry script exists at `/The-Forge/assets/...`.
- Keep `scripts/test-legacy.mjs` and the pinned CTK checkout in the **verification** CI job for original tests and direct parity comparisons. The Playwright browser job no longer needs a CTK checkout.
- Keep the GitHub Pages deployment workflow manual and do not deploy from this branch.

## Tests and gates

Expected CI checks: `npm test`, `npm run build`, and all Playwright tests. `npm run build` runs `verify-native-dist.mjs` after Vite, and E2E watches for obsolete iframe network requests.

**No Visual redesign** and **no Video Compressor replacement** are included.

Original CTK serves as a test-only reference for exact behavior comparisons. We still cannot claim customer-file, authenticated SharePoint, unusual PDF or MP4/MOV codec parity from generated fixtures. Keep the PR draft and retain a straightforward rollback path through the prior `migration/feature-parity` branch.

## Size and security checks

GitHub Actions reports the number and bytes of files in `dist/`. Removing the iframe should eliminate the old CTK script, style and compressor payload; verify the output rather than asserting an invented reduction. The native tools still use browser File, Canvas, PDF.js and object URLs. No new app dependencies or network services are introduced.
