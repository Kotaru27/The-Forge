# The Forge — Ink & Paper / Approval Prototype

**Scope:** Home + Logo Resizer visual concept only. Based on the original reference image “The Forge: Creative Toolkit Dashboard.png” shared 2026-11-14.

**Target repository:** `Kotaru27/The-Forge`. Existing React 19 + TypeScript + Vite app. The demo is intentionally standalone HTML/CSS/JavaScript with SVG sketches, so its art direction can be inspected without touching production components, conversion/rendering algorithms, dependencies, or deployment.

**Reference-critical composition:** 196px notebook-margin navigation, giant graphite brand title, blue-ink handwritten greeting, static artistic checklist and forge illustration, seven sketched cards in a **4 + 3** layout, warm textured ivory paper, deep blue pen captions, yellow marker name strokes, rust correction accents, hatching and paper-tape details.

**Logo Resizer composition:** center-aligned dimension presets `150×150 / 200×200 / W` above `250×250 / 200×150 / H`, one compact controls panel with import/link, PNG/JPG and text controls, positioning, clear/ZIP, and spacious file board. Local raster image uploads, drag/drop, filename editing, label text, focus navigation, presets and empty/loaded states are interactive **for visual evaluation only**. The production PPTX/XLSX extraction, high-quality renderer and export features are not wired into the demo.

**Known baseline discrepancy:** the inspected `main` and existing design branches still invoke a dimensions confirmation dialog before importing, while the user-approved behavior is direct upload. This requires a *separately scoped, approved behavior fix* before full visual rollout; do not silently change rendering or import flows as part of a CSS redesign.

**Verified locally:** Chromium screenshots at 1440×900, 1586×992 (reference dimensions), 1920×1080; seven cards, button navigation, preset selection, custom input deselection, PNG direct upload, editable filename, Focus Mode open/close, Escape, links modal, and no horizontal overflow at those desktop widths. Production `npm test`, `npm run build`, and production Playwright E2E have **not** been run; the production source is untouched.

**Approval gate:** no merge, deployment, tool renaming, algorithms, exports, Storyboard logic, or CTK changes. After art approval, port components and tokens to React on the isolated branch, then stage seven workspaces with production regression checks.