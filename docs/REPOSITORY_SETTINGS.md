# The Forge — GitHub repository settings

**Suggested maintainer actions, not completed settings changes.** The connected GitHub actions available for this update do **not** expose repository About/topics/homepage, branch rules, private vulnerability reporting, or creation of GitHub Releases.

## Copy into the About panel

**Description:** Desktop-first creative toolkit with seven React/TypeScript workspaces for image, PDF, video, storyboarding and media workflows.

**Website:** https://kotaru27.github.io/The-Forge/

**Topics:** `react`, `typescript`, `vite`, `creative-tools`, `image-processing`, `pdf`, `video-processing`, `storyboard`, `productivity`

Do not advertise Windows packaging or Video Compressor as shipped.

## Settings to verify in GitHub

1. On [The Forge repository](https://github.com/Kotaru27/The-Forge), use **About → Edit** to set the description, Website and topics; confirm the updated values show on the landing page.
2. Review **Settings → Branches / Rulesets** for a sensible required-CI and code-review policy on `main`; do not accidentally block the separate approved preview workflow.
3. Review **Settings → Security** and enable **Private vulnerability reporting** if available; only then publish a tested private reporting link in [SECURITY.md](../SECURITY.md).
4. Review the 17 older open PRs **individually**. Do not bulk-close or merge stacked/overlapping work without checking exact changes.
5. Use [release readiness](RELEASE_READINESS.md) before publishing a GitHub prerelease from the **tested preview commit**.

**Reason for manual steps:** these are repository-level administrative controls, not changes to `src/`, `package.json` or GitHub Pages files.
