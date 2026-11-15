# Ink Atelier visual experiment

Branch: `design/ink-atelier-preview-20261115`

## Scope

This branch tests a reusable, hand-drawn visual system based on the user-supplied Forge sketchbook reference. It is **not** approved for production. The intro animation is deliberately excluded.

- Uses MIT-licensed Rough.js for deterministic hand-ink contours on each Home tool card.
- Uses custom pressure-varied SVG borders, material-style paper fibers, corner hatching, and irregular yellow highlighter strokes across existing components.
- Preserves all seven React tool components, processing engines, imports, exports, routing, dimensions, and workflows.
- Leaves `Kotaru27/CTK` unchanged.

## Isolated GitHub Pages URL

The preview workflow combines a fresh build of unchanged `main` at the production root with the tested design-branch build in a subdirectory:

- **Production:** https://kotaru27.github.io/The-Forge/
- **Ink Atelier branch preview:** https://kotaru27.github.io/The-Forge/ink-atelier-preview/

The workflow verifies that all files copied to the production root match its untouched `main` build before publishing. It never commits to `main`.

A later `main` Pages deployment normally replaces the site artifact and can remove this temporary preview subdirectory; rerunning the preview workflow restores it. Never use the original manual Pages preview workflow for this experiment, because it publishes over the production root.

## Review gates

1. Build, unit tests and existing Playwright tests.
2. The new `e2e/ink-atelier.spec.ts` rendering and layout checks.
3. GitHub Pages deploy plus live checks of production and preview roots.
4. Human visual approval against the original illustration reference.

No production merge until explicitly approved.
