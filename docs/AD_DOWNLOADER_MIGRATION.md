# Ad Downloader — migration parity checklist

Uses the pinned official SheetJS 0.20.3 package to avoid the older npm 0.18.5 parser. Keep .xls and .xlsx compatibility tests as a release gate.\n\nThe original CTK tool lives in `CTK/src/js/tools/ad-downloader.js`, with SharePoint handling in `core/sharepoint-graph.js` and folder-based renaming in `core/download-rename.js`. This migration is a standalone React/TypeScript workspace; it does not use the old iframe.

## Features retained
- Excel `.xlsx` and `.xls`, first-sheet ad data, clickable hyperlinks and auto-detected columns (fallback: A=number, B=link, C=type).
- **Required approved writable Auto-name folder before Excel import**. Uses the browser's File System Access API; intentionally unavailable without a secure supported browser.
- Predictable generated AD filenames, duplicate suffixes, recognized/inferred extensions, individual copy and downloads, Copy Names, Copy Bucket Table and Copy Script (Forsta).
- Native SharePoint download in a separate top-level tab, not a CORS fetch. Requested is distinct from prepared and verified. Auto-name folder monitoring tracks only newly downloaded, unambiguous files; safe in-place renaming retains the original until the fallback copy is fully compared.
- Fix downloaded name for previously downloaded media, and Save named copy for an explicitly selected local file.
- Individual CORS downloads with real extension sniffing, HTML/login page rejection, no credentials, 350MB limit. Selected ZIP download with 3 concurrent fetches, up to 250 assets, 350MB limit, compressed ZIP named `ad_assets.zip`.
- Status, selection, requested/prepared sections, download again, errors and manual recovery.

## Quality checks
- `tests/ad-downloader.test.mjs` covers naming, workbook formats, SharePoint URL safety and download validation.
- `e2e/ad-downloader.spec.ts` covers the required folder permission gate, import and actions, ZIP and SharePoint request flows using local fixtures and mocked browser APIs.
- Original CTK regression tests remain in GitHub Actions, alongside React TypeScript build and all migrated tools' browser scenarios.

## Before merging
- Compare representative real Excel workbooks, SharePoint native downloads on signed-in Chromium and actual Auto-name folder contents.
- Large batches and external CORS-host behavior need real-browser validation. Do **not** claim actual filesystem rename parity until tested with a user-authorized download folder.
- The original Video Compressor still uses the compatibility iframe and must remain untouched.
