# Third-party sources and licensing inventory

**The Forge's original source code and project documentation are licensed under [MIT](LICENSE) (Copyright © 2026 Kotaru27).** This notice is a **provenance inventory, not a substitute for upstream license files or legal clearance**. The project's MIT license applies only to material the Forge copyright holder has the right to license; it does **not** overwrite the copyright or separate licenses of bundled skills, dependencies, third-party assets or other independently licensed works. License terms for each external component must be verified against the exact version distributed.

## JavaScript and development dependencies

The packages declared in [package.json](package.json) include:

| Dependency | Source / role |
| --- | --- |
| React, React DOM | https://react.dev — application UI |
| JSZip | https://stuk.github.io/jszip — archive creation |
| Pica | https://github.com/nodeca/pica — image resizing |
| PDF.js (`pdfjs-dist`) | https://mozilla.github.io/pdf.js/ — PDF rendering |
| SheetJS CE (`xlsx`) | https://sheetjs.com — spreadsheet handling; package is fetched from the SheetJS CDN |
| TypeScript, Vite and React plugin | Compiler / build tooling |
| Playwright | Browser testing |
| React and Pica type declarations | Development types |

For the deployed Studio preview, the `release/pages-preview` branch also declares `motion` for animation. Do not mix the package inventories of `main` and the preview branch. Review license files shipped with resolved packages and their transitive dependencies before any redistribution decision. This list does not grant rights to third-party code.

## Bundled agent skills

The committed `.agents/skills/` directory contains third-party agent guidance and selected supporting resources. Their source revisions and upstream repositories are indexed in [.agents/skills/README.md](.agents/skills/README.md). Preserved upstream notices appear in `.agents/skills/_licenses/` and individual skill directories. They are **not** runtime app dependencies. The Forge's MIT license does **not** overwrite or contradict their own terms.

## Migrated code, designs and fixtures: provenance checks

- The Forge maintainer has authorized MIT licensing of original Forge code, including the original code migrated from their separate [CTK repository](https://github.com/Kotaru27/CTK). This does not grant rights over third-party materials or work-specific assets that the maintainer does not own.
- The Studio preview includes an independently authored Elastic Reel implementation **according to its source comments**; confirm no React Bits Pro or other restricted implementation was copied.
- Verify the origin and redistribution rights of `e2e/fixtures/stills.webm` and any additional test fixtures.
- Check that hard-coded external media endpoints and example names are authorized to share publicly and do not expose confidential resources.

**Selected project license:** MIT (OSI-approved) for original Forge code and documentation. The third-party source, fixture and external-service checks above remain open and must be resolved before asserting that all bundled material is independently cleared for redistribution.
