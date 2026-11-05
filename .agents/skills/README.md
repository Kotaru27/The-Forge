# Project-local coding skills

These **14 skills** were copied from the cited upstream repositories at **pinned revisions**, with relevant supporting reference files intact. They are available to coding agents that recognize `.agents/skills/`. They do **not** run automatically during a Vite build or change the deployed website.

## Installed catalog

| Skill | Why it is here | Pinned upstream |
|---|---|---|
| ponytail-audit | Find correctness problems, dead code and unjustified complexity | DietrichGebert/ponytail |
| ponytail-review | Audit migration pull requests without assuming changed code is safe | DietrichGebert/ponytail |
| test-driven-development | Verify the intended behavior with a failing test before coding | obra/superpowers |
| systematic-debugging | Investigate root causes instead of patching symptoms | obra/superpowers |
| verification-before-completion | Require fresh build/test evidence before claims | obra/superpowers |
| playwright-cli | Browser interaction, upload/download and integration checks | microsoft/playwright-cli |
| react-best-practices | React performance and state/effect guidance | vercel-labs/agent-skills |
| deprecation-and-migration | Safely replace CTK code without losing features | addyosmani/agent-skills |
| ci-cd-and-automation | Reliable GitHub Actions quality and deployment checks | addyosmani/agent-skills |
| incremental-implementation | Small, testable migration steps | addyosmani/agent-skills |
| security-review | Check file, URL, browser and dependency risks | getsentry/skills |
| skill-scanner | Inspect future third-party skill packages for unsafe content | getsentry/skills |
| codebase-design | Keep module interfaces small and behavior cohesive | mattpocock/skills |
| diagnosing-bugs | Reproduce and isolate tricky failures | mattpocock/skills |

## Pin and provenance

- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail/tree/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846): `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846`
- [obra/superpowers](https://github.com/obra/superpowers/tree/22f0b463e7a5e579904dd6211a520321035526f7): `22f0b463e7a5e579904dd6211a520321035526f7`
- [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli/tree/f50f57905b9fd3dd355330719ddf0687000c9437): `f50f57905b9fd3dd355330719ddf0687000c9437`
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62): `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills/tree/301b02b12bff98e4688e6984af6556802322bbde): `301b02b12bff98e4688e6984af6556802322bbde`
- [getsentry/skills](https://github.com/getsentry/skills/tree/0c464f411bdfb8d4c12314b36264d06cb2f60270): `0c464f411bdfb8d4c12314b36264d06cb2f60270`
- [mattpocock/skills](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d): `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`

Upstream LICENSE documents are preserved under `_licenses/`, and the Sentry `security-review/LICENSE` is kept inside its original skill. The Vercel React skill's upstream frontmatter declares MIT; its source repository has no root LICENSE file at this revision. Do not strip licenses or author attribution when updating skills.

## Installation and use

The portable repository layout is `.agents/skills/<skill-name>/SKILL.md`. A compatible coding agent can discover these on the project. Read only skills relevant to the current task.

No package installation or configuration change was needed in `package.json`; the skills are guidance, not runtime dependencies. The Microsoft `playwright-cli` skill describes an optional separate CLI, whereas this repo already uses `@playwright/test`. The Sentry `skill-scanner` helper uses Python and `uv` if the helper is executed. Neither CLI was installed by copying the skill.

## Security and maintenance

Source scripts were inspected before copying. They are **not** invoked by builds, tests or CI. Inspect them again before running; never execute scripts from an unreviewed update. Update pinned skill sources only in a dedicated reviewed pull request, and rerun repository tests to ensure the migration remains unaffected.

This installation deliberately excludes UI/design and animation skills, Vercel-hosted deployment skills, and the postponed Video Compressor implementation.
