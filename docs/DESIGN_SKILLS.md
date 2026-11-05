# Reviewed visual-design skills for The-Forge

Added to `.agents/skills/` on a dedicated installation branch. **This changes agent guidance only**, not the deployed site's appearance or processing engines. Preserve the original working logic of the seven React tools. **Never copy CTK's visual appearance.** Video Compressor is excluded.

## Installed

| Skill entry point | Source revision | Role |
| --- | --- | --- |
| `impeccable` | `pbakaus/impeccable@c8891a9ae865d6ee311836ae5199bfce0fe115b1` | Fresh design world, layout, typography, critique and polish |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill@b7d5353e0130feb8c5574ef1251f8a1db1873ccb` | Local searchable UI/UX and font knowledge |
| `frontend-design` | `anthropics/skills@ca45fc496a3436251f191354091d557da31c15b5` | Original visual art direction and coherent implementation |
| `design-taste-frontend` | `tasteskill/tasteskill@37c8c376b92ebc02456f7c70776b514fddda88e1` | Anti-generic frontend design review |
| `gpt-taste` | same Taste revision | Optional stricter visual and motion critique |
| `redesign-existing-projects` | same Taste revision | Inspect the current shell before proposing replacements |
| `web-design-guidelines` | `vercel-labs/agent-skills@1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` | Accessibility and web UI audit |

The Vercel guideline reference is pinned to `vercel-labs/web-interface-guidelines@434b7f91364665f2f733b310ec54809bf8f37937`, rather than loaded dynamically.

## Safety and installation decisions

- Only source-verified text references and essential local Python search scripts/data were copied. The source revisions above are fixed, not moving `main` URLs.
- **Impeccable** is the reference-only edition: its optional binary launcher/hook engine and downloaded executable were deliberately excluded. Some advanced browser live-mode/CLI features therefore require a separate, explicit, reviewed setup; read the installed written references manually.
- **UI/UX Pro Max** has `scripts/search.py` plus its local CSV catalogs, font metadata and stack guides. Nonessential upstream test fixtures, raw import caches and catalog-generation tooling were not bundled. It requires Python 3 for search; no Python or npm package is installed by this change.
- **Web Design Guidelines** reads the bundled snapshot at `reference/web-interface-guidelines.md`; it does not require a live remote-rule fetch.
- Taste variants are separate source skills, **not** a requirement to add GSAP or any animation dependency. Use them only when relevant to the user-approved visual direction.
- Licenses and notices are preserved in their original skill directories or `.agents/skills/_licenses/`. The Vercel agent-skills root did not declare a root license in the reviewed source; the separate web-interface-guidelines snapshot has its MIT license.
- Do not execute third-party scripts automatically, enable hooks, fetch binaries, or modify account/agent permissions to make a design skill run.
- No changes to `src/`, `package.json`, Vite build config, GitHub Pages workflow, or CTK. A local design demo must be user-approved before app changes.

## Use in the next design task

1. Define an **independent desktop visual identity**; CTK is an anti-reference, not a template. Use `frontend-design` and `impeccable/reference/new-work.md` for distinct concepts.
2. Consult the UI Pro Max offline search catalogs, e.g. from repository root:

   ```bash
   python .agents/skills/ui-ux-pro-max/scripts/search.py "desktop creative productivity toolkit" --design-system
   python .agents/skills/ui-ux-pro-max/scripts/search.py "keyboard focus navigation" --domain ux
   python .agents/skills/ui-ux-pro-max/scripts/search.py "desktop app panels" --stack react
   ```

3. Use `design-taste-frontend`, `gpt-taste` or `redesign-existing-projects` as optional creative critics, not rigid visual mandates.
4. Create a standalone interactive HTML concept **before** changing the seven working React tools.
5. Once approved, apply the design on a separate branch, use `web-design-guidelines`, existing Ponytail/React skills, Playwright screenshots and regression tests to prevent regressions.
