# Migration decisions

- New target repository: Kotaru27/The-Forge.
- Existing source repository: Kotaru27/CTK; left unchanged.
- Initial scope: React + TypeScript + Vite, AMOLED black shell, original tools through compatibility bridge.
- Later scope: typed tool engine migration, then Tauri 2 and updater.
- Source pinned to CTK commit 617615c0b4370c795ddfd6dc4c300920cd595883.
- No cinematic intro, decorative homepage, animations or extra UI in the new shell.
- No processing algorithm rewrite in the initial commit.
- No public deployment or Windows installer yet.
- Generated public/legacy and dist folders are ignored.
- Regression baseline: 63 passing CTK Node tests; browser-based file-output testing remains to do.
- Before desktop packaging, vendor the verified engines into The-Forge to remove the upstream fetch.
