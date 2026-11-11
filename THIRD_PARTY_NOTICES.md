# Third-party sources and licensing inventory

This document is a **provenance inventory, not a substitute for upstream license files or legal clearance**. The Forge does not yet have an approved project-wide license. License terms for each component must be verified against the exact distributed version before a blanket LICENSE is added.

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

The committed `.agents/skills/` directory contains third-party agent guidance and selected supporting resources. Their source revisions and upstream repositories are indexed in [.agents/skills/README.md](.agents/skills/README.md). Preserved upstream notices appear in `.agents/skills/_licenses/` and individual skill directories. They are **not** runtime app dependencies. The Forge's future project-wide license must not overwrite or contradict their own terms.

## Migrated code, designs and fixtures: pending rights verification

- The Forge's tools were migrated from the author's separate [CTK repository](https://github.com/Kotaru27/CTK); verify ownership of code and any work-specific assets before licensing it broadly.
- The Studio preview includes an independently authored Elastic Reel implementation **according to its source comments**; confirm no React Bits Pro or other restricted implementation was copied.
- Verify the origin and redistribution rights of `e2e/fixtures/stills.webm` and any additional test fixtures.
- Check that hard-coded external media endpoints and example names are authorized to share publicly and do not expose confidential resources.

**Open decision:** Select an OSI-approved project license only for material the maintainer can legally license; preserve separate third-party license and notice obligations. Until resolved, do not present The Forge as an already OSI-licensed project.
