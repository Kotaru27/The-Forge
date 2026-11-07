# Seven-tool integration verification

Scope: combine the existing stacked React migration branches into one web release candidate. Base: `migration/logic-skills` (which already contains all seven native tool implementations and their source-tested migrations).

## Release route policy
- Ship: Logo Resizer, PDF to Image, Image Splitter, Video Stills, Storyboard (Grid Board and Fit to Platform; Filmstrip removed), Link Generator, Ad Downloader.
- Defer: Video Compressor. It is omitted from the user-facing navigation and direct hash links fall back to Logo Resizer. **Do not rebuild it now.**
- Preserve the legacy CTK source/bridge files and their baseline tests for now. The old embedded UI is no longer loaded while a native release tool is in use; removing pinned legacy assets is a separate, gated cleanup.

## New integration checks
1. Seven navigation entries mount, render correct headers and stay on the selected hash route.
2. Native workspaces do not initialize the hidden legacy iframe on these routes.
3. Invalid and deferred routes normalize to the release default.
4. Link Generator retains its entered data and generated output while temporarily hidden (as other native tools already do).
5. Image Splitter retains files and settings across tool navigation.
6. Browser CI **builds and previews** under `/The-Forge/`, verifying that production scripts resolve beneath that path. The preview server must receive `FORGE_BASE_PATH` too; a matching build alone is insufficient.
7. Existing per-tool browser and unit tests remain required.

## Before promoting this integration
- Compare outputs against the original using representative real PPTX/XLSX/PDF/images/video and SharePoint workbooks.
- Validate folder permissions and rename recovery in real secure Chromium environment; mocks are not sufficient.
- Test mobile only for basic safety; **desktop is primary**.
- Do not merge into `main` or run GitHub Pages deployment until the above tests and parity reviews pass.
- Keep Video Compressor postponed and do not introduce design changes.

## Skill-driven workflow
Use `deprecation-and-migration` and `ponytail-review` to protect parity; `verification-before-completion` and Playwright for release checks. Changes are designed to be small and reversible.
