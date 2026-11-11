# Contributing to The Forge

Thank you for considering helping with The Forge. This repository is actively maintained, but its project-wide open-source license is **not yet finalized**. Please open an issue to discuss code contributions before submitting a PR; do not assume publicly available source can be copied or relicensed.

## Scope and existing behavior

The Forge currently contains seven React/TypeScript workspaces. Existing file-processing logic, input/output contracts, presets, naming, downloads, keyboard controls and cross-tool transfers are **behavior-locked**. Filmstrip is retired and Video Compressor is excluded. An unsolicited feature addition, dependency upgrade or visual redesign is not automatically in scope.

Small changes with a specific, verifiable purpose are preferred. For a bug, include reproduction steps, expected versus actual behavior, browser/OS and a minimal **synthetic** fixture where possible. Never upload private campaigns, proprietary logos, survey responses, SharePoint credentials, personal information or other confidential materials.

## Before a pull request

1. Create an issue explaining the problem or proposed documentation improvement and discuss its scope.
2. Work on a separate branch; do not rewrite `main` or push directly to `release/pages-preview`.
3. Keep changes limited to the approved files and document affected workflows. Avoid copying third-party components or skills without checking the original license.
4. For code changes, run `npm run test:unit`, `npm run build`, relevant Playwright cases, and the pinned CTK regression suite (`npm test`) when its baseline is available.
5. In the PR, describe what changed, unchanged behavior, exact tests and remaining unverified cases. Attach screenshots only if the UI intentionally changed and use non-sensitive samples.

See [README.md](README.md) for setup and [docs/FEATURE_PARITY_GATE.md](docs/FEATURE_PARITY_GATE.md) for remaining release acceptance requirements. A green synthetic test is not proof that all real customer files work.

## Review and licensing

A maintainer must review scope, provenance and test evidence before merging. Contributions may be deferred until project-level licensing and intellectual-property questions are resolved. Do not include third-party assets, generated source from proprietary products, or employer-owned code without permission. There is no guarantee that an issue or PR will be accepted.

Report security concerns privately following [SECURITY.md](SECURITY.md), not in public issues.
