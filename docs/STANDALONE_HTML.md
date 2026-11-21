# The Forge — standalone HTML edition

The HTML edition has a minimal navigation shell rather than the animated
sketchbook presentation. It **reuses the same seven TypeScript/React tool
components and processing engines** as the existing application. It is **one
self-contained HTML delivery file**, not a rewrite of the processing engines
into framework-free JavaScript.

## Build

Requires Node 22.12+:

```bash
npm install
npm run build:html
```

Open `dist-standalone/the-forge.html` in a Chromium-based browser, or share
that file directly. No web server, asset directory, remote font, or GitHub
Pages is required for browser-local tools. The `build:html` command verifies
that there are no unbundled JS/CSS/worker files in the output.

All seven tools retain their original processing settings, names and exports.
The Video Stills → Storyboard transfer remains in the same document.

**Browser limitations still apply:** remote media hosts must allow CORS for
byte-fetching and custom-named ZIPs. Authenticated SharePoint downloads use
the browser's own session and native downloads, not cross-origin fetches.
Auto-name folder monitoring requires a browser with File System Access API
support and a user-approved writable directory. File-based HTML pages can
have stricter permissions in some environments; test the actual browser.
Complex PDFs and certain video codecs still depend on the browser's support.

The GitHub Pages publisher is not modified or triggered by the HTML build.
