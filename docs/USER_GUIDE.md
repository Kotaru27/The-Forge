# The Forge — getting started

Use the [seven-tool desktop preview](https://kotaru27.github.io/The-Forge/). Begin with non-confidential samples and inspect all exported files. This is a **preview**, not a claim that every file or browser is supported.

## Tool-by-tool workflows

| Tool | Basic steps | Important limit |
| --- | --- | --- |
| **Logo Resizer** | Import images or supported Office media; choose **150×150, 200×200, 200×150, 250×250** or custom size; edit labels/position; export image or ZIP | White output background; real PPTX/XLSX/XLSM edge cases still need acceptance |
| **PDF to Image** | Add PDFs; choose PNG/JPG; review and select pages; download selected or all | PDF.js renders locally; scanned, encrypted and unusually large PDFs need additional testing |
| **Image Splitter** | Add images; select files; choose **1–50 vertical columns**; run **Split Images**; export ZIP | Verify narrow-image errors and real high-resolution results |
| **Video Stills** | Add videos; review/select extracted frames; export or **Send to Board** | Decoding depends on browser codec support; selected frames go to **Grid Board** |
| **Storyboard** | Create/manage **Grid Boards** or use **Fit to Platform**; import assets; export board images/ZIP | Large real campaign boards need manual visual comparison |
| **Link Generator** | Supply supported media names/settings; generate and inspect URL/code output; copy as needed | Generating a URL does not upload assets or prove a third-party file is accessible |
| **Ad Downloader** | In compatible desktop Chromium, first approve the **Auto-name folder**; import XLS/XLSX; review names, links and select downloads | External CORS and SharePoint permissions apply; SharePoint uses native individual downloads, **not ZIP** |

Filmstrip and Video Compressor are **not** included in the current seven-tool release. There is no Windows installer.

## Privacy and browser permissions

- Local transforms operate in the browser; avoid sharing real client materials in public bug reports.
- Ad Downloader's local folder operations depend on a compatible secure browser and deliberate filesystem permission.
- External media links/SharePoint may contact third-party services. Use only files and accounts you are authorized to access.
- Never share signed URLs, survey data, campaign assets, passwords or screenshots of private files in GitHub issues.

For detailed limitations see [feature parity](FEATURE_PARITY_GATE.md), [release readiness](RELEASE_READINESS.md) and [security](../SECURITY.md). For feedback, use [GitHub Issues](https://github.com/Kotaru27/The-Forge/issues/new/choose) with synthetic examples.
