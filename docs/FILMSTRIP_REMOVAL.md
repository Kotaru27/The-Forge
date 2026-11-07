# Filmstrip feature removal — release scope

## Requested change

Remove the **Filmstrip mode/tool** entirely while retaining Storyboard's **Grid Board** and **Fit to Platform**, and retaining Video Stills → Grid Board.

## Removed from native application

- Filmstrip tab, controls, asset import, preview, sorting/reordering, clear action and JPG/PNG exports
- Grid Board → Filmstrip and Filmstrip → Grid Board flows
- Filmstrip-specific types, state, renderer, constants, row-distribution helper and transfer destination
- Video Stills "Send to Filmstrip" action
- Stale Filmstrip-only unit and browser tests

## Preserved and verified

- Grid Board imports (image/video and folders), board/project state, frame movement, JPG and bulk ZIP
- Fit to Platform reference geometry and PNG/JPG outputs
- Video Stills selected-frame transfer to Grid Board from both the toolbar and individual collection dialog
- All other seven top-level tools and the native-only GitHub Pages base path

New browser regression checks assert only two Storyboard tabs and successful Grid Board/Fit behavior, including a selected-frame transfer from one video. Static regression test checks that none of the removed source modules retain Filmstrip functionality.

## Release safety

This feature removal is layered on top of the release audit security fixes; **do not deploy the earlier release branch without those fixes**. The original CTK source remains available as a test oracle but is excluded from the web build. No changes to the postponed Video Compressor.
