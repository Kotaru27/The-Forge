# The Forge Logo Resizer — V8 Motion & Interaction Research
**Research date:** 2026-11-06 · **Scope:** research and skill setup only; no production UI changes.

## Project facts
- React 19.2 + Vite 7.3 + Motion 14.9.1 + Playwright 1.59.1 (checked in `package.json`).
- The existing independent canvas renderer, white output, Office extraction, per-logo editing, and PNG/JPG/ZIP/link outputs are **locked**.
- Preserve the approved The Forge wordmark, custom Logo Resizer icon, single header, right-side Focus Mode sidebar, eight global control groups and their order, and presets 150×150 / 200×200 / 200×150 / 250×250.
- Desktop-first; prioritize 1024, 1366, 1536, 1920px, including 720px screen height.

## Skills installed on the research branch
1. `apple-design` — [emilkowalski/skills](https://github.com/emilkowalski/skills/tree/c8a79627b59d72d764d6ab6f2c87c09a48169833/skills/apple-design) (MIT). Velocity-aware springs, interruption, physical response, and spatial consistency.
2. `ui-animation` — [mblode/agent-skills](https://github.com/mblode/agent-skills/tree/5eeba20fa3b9b142be7705ee9e6c7401e7ee6f08/skills/ui-animation) (MIT). Full animation-reference and video-analysis script set: component patterns, debugging, timings, performance, curves.
3. `playwright-visual-regression` — [RoninForge/roninforge-playwright](https://github.com/RoninForge/roninforge-playwright/tree/dfe26f961b7486c2150d3fc57473c510759e51b5/skills/playwright-visual-regression) (MIT). Linux-stable screenshots, approved baselines and real diff review.

Skill source instructions and reference files were copied verbatim, with source licenses; this did **not** install runtime React dependencies or deploy any site.

## Research references — what to study, not what to copy
- **Apple, Designing Fluid Interfaces (WWDC 2018):** https://developer.apple.com/videos/play/wwdc2018/803/ . Response first, dynamic springs, velocity continuity and interruptibility; preserve interaction during movement.
- **Apple Human Interface Guidelines — Motion:** https://developer.apple.com/design/human-interface-guidelines/motion . Brief, comprehensible feedback; respect reduced motion.
- **Awwwards evidence-grounded case study skill:** https://github.com/owenisas/awwwards-web-design . Its 51 teardowns show that memorable work has **one owned idea**, not a dozen effects. Most examples are marketing websites; do not import their heavy scroll/3D practices into a batch editor.
- **Motion React layout animation:** https://motion.dev/docs/react-layout-animations . Native React state/FLIP shared layout; beware multiple live elements with same `layoutId` (can crossfade and cause blank/ghosted canvas), scroll container measurements and scrollbar layout changes.
- **Motion Primitives morphing dialog:** https://motion-primitives.com/docs/morphing-dialog . Useful reference for continuous container transitions, but not drop-in replacement for Focus Mode or a live canvas.
- **Animate UI primitives:** https://animate-ui.com/docs/primitives . Animated accessible Select, Dialog, Slider, Button and Tabs based on Motion + Radix/Base UI/React Aria. Best **new** dependency candidate for a *single pilot*; do not wholesale import components or styling.
- **GSAP Flip:** https://gsap.com/docs/v3/Plugins/Flip/ . Specialized fallback if measured Motion-only layout orchestration is insufficient. Do not duplicate the same element's transform ownership across GSAP and Motion.
- **Rive:** https://rive.app/ . Only if a custom Forge vector animation is authored; not needed for the functional workroom.
- **Playwright visual snapshots:** https://playwright.dev/docs/test-snapshots . Capture settled states on one CI platform, hand-review diffs before accepting baseline changes.

## Library decision table

| Candidate | Use | Cost/risk | Decision |
|---|---|---|---|
| Motion (already installed) | Gallery reflow, interruption, carefully bounded Focus Mode transitions | Current code has conflicting projection/layout ownership if reused carelessly | **Keep core** |
| CSS transitions + Web Animations API | Press, hover, focus and simple visual feedback | Lowest overhead, must avoid `transition: all` | **Use** |
| Animate UI | Accessible animated select/dialog/button and slider primitives | Integration with existing native forms and styles must be tested | **Prototype selected controls only** |
| Motion Primitives | Contextual morph patterns | Copy/paste components can clash with live canvas | **Reference, not global install** |
| GSAP + Flip | Exact timeline/FLIP choreography | Another runtime and imperative cleanup | **Deferred unless measured need** |
| React Spring | Physics-oriented alternative | Overlaps existing Motion | **Skip** |
| Rive | Authored vector artwork | Asset + WASM/runtime + artist time | **Skip** |
| Lenis | Marketing scroll smoothing | Bad fit for precise nested scroll editors | **Skip** |
| Three.js / React Three Fiber | 3D scenes | Large scope and unnecessary GPU cost | **Skip** |

## Proposed V8 signature: **Forged into place**
Give the *assets* continuity, not arbitrary glowing borders or motion on every element.
1. **Arrival:** drag/drop preview acknowledges a real file operation; 9 logos enter in short batches with stagger capped at 4–6 cards, no repeated giant reveal. The grid reflows with interruptible spring motion.
2. **Precision:** presets use a bounded moving selected state; the output canvas's display size transitions without re-rendering exported pixels or changing dimensions; sliders update instantly, without queued animations.
3. **Editing:** card remains visible and painted while the right inspector opens; sidebar shifts a bounded distance; controls remain clickable and keyboard focus behaves naturally. The two canvas instances must **never** share Motion projection state.
4. **Completion:** save/export buttons confirm work **in place**, not only with corner toasts. ZIP progress displays actual render/compression state.

## Prototype and QA gate (before touching production UI)
Build a real React interactive design sandbox for **the control deck + 9-logo gallery + right sidebar**. No mock inert buttons. Prefer one cohesive system over staged CSS override layers.

Test manual and automated sequences:
- Empty state; drag 1/9/20+ real logos; open 6th after scrolling; close and reopen rapidly; navigate previous/next with keyboard.
- Change each of the 4 presets repeatedly; custom W/H; edit labels/font/color/padding and per-logo overrides while resizing.
- Ensure no blank canvas, ghost overlay, lost scroll/focus, clipped font name, white scrollbar, controls covered by preview, or toolbar overlap at widths 1024/1366/1536/1920 and height 720.
- Record video at normal speed; review actual intermediate frames. Include `prefers-reduced-motion`; high-frequency actions must remain immediate.
- Capture Chrome Performance traces for 9 and 20 assets; measure long frames, layout shifts, input delays and retained canvas memory. Aim for smooth 60fps on representative desktop hardware; do not claim a performance rating without traces.
- Compare screenshots before/after on fixed Linux Chromium in CI with intentional baseline approval.
- Require full existing functional, Office-import, label, ZIP and links parity tests; user approves the interactive prototype **before** merging/deploying V8.

**Current recommendation:** Retain Motion, prototype Animate UI's select and dialog patterns (not whole library replacement), develop an original Forge asset-arrival/precision motion language, and gate release on **actual video + visual QA** rather than passing unit tests alone.
