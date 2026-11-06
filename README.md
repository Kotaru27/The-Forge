# The Forge — Creative Toolkit

A local-first, desktop-oriented creative workspace built with React 19, TypeScript and Vite. The Forge has its own graphite-and-brass visual system, distinct from the CTK source application.

## Current architecture

React owns the navigation, title bar, and native Link Generator. The other tool engines still execute in an isolated compatibility iframe, generated from a pinned public CTK baseline; processing behavior is preserved until it is migrated and independently verified. The current routes are Logo Resizer, PDF to Image, Image Splitter, Video Stills, Storyboard, Link Generator, Ad Downloader and Video Compressor.

### Logo Studio (visual upgrade)

The Logo Resizer's original processing engine remains unchanged. A scoped layer in `src/legacy/forge-logo-studio.css` and `src/legacy/forge-logo-studio.js` adds:
- Graphite/brass interface, refined controls and typography, animated action feedback
- Animated side-by-side, right-hand asset inspector (focus mode)
- Real export-aspect-ratio preview cards, output stage, file counts and import drop affordance
- Quick output presets: 150×150, 200×200, 200×150, 250×250
- Reduced-motion alternative, keyboard activation of asset previews

Image and Office-media import, high-quality resizing, per-card edits, per-card download, ZIP export and original file handlers stay in the pinned CTK engine. No CTK code is modified or republished.

## Local development

Requires Node.js 22.12+ and Git. Run:

```bash
npm install
npm run dev
npm test
npm run build
```

`npm run prepare:legacy` clones and verifies the pinned CTK commit, creates `public/legacy`, copies approved unchanged CTK runtime assets and applies the isolated Forge visual skin. You can set `CTK_SOURCE_DIR` to a local CTK checkout instead. Generated content in `public/legacy` is ignored by Git.

## Verification and deployment

Pushes and pull requests run `.github/workflows/ci.yml`, which runs the original CTK compatibility tests, React bridge tests, TypeScript typecheck and production build. On successful main-branch CI, the Pages workflow builds and publishes the `/The-Forge/` static site. Deployments are serialized to avoid collisions when multiple UI commits land close together. GitHub Pages also supports a manual dispatch.

**Automated checks do not establish visual/browser parity.** Before declaring the UI production-ready, test image and PPTX/XLSX imports, size prompts, overrides, focus open/close, keyboard navigation, delete/clear/undo, PNG/JPEG export and ZIP contents on a real desktop browser with representative files.

## Future migration

Replace each iframe engine with React + TypeScript only after input/output and workflow parity are demonstrated. The last compatibility bridge should be removed only when all migrated tools have regression coverage. The site is static and does not provide access control; do not upload confidential material.
