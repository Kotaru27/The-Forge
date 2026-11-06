---
name: playwright-visual-regression
description: "Set up Playwright visual regression with toHaveScreenshot: mask volatile regions, animations: 'disabled', maxDiffPixels, the macOS-vs-Linux baseline trap (the #1 visual-regression gotcha), the CI workflow for diff review, and when to reach for Argos / Chromatic / Percy instead of the built-in."
---

# Set up Playwright Visual Regression

## When to Use

When you want to catch unintended UI changes - layout shifts, color regressions, missing elements - that pass functional tests. Visual regression is a complement to web-first assertions, not a replacement.

## Decision tree

- **Single-browser project, small surface, can pin CI to one OS** → Built-in `toHaveScreenshot()` (this skill).
- **PR-attached visual diff approval flow, OSS-friendly** → Argos (`@argos-ci/playwright`).
- **Storybook design system** → Chromatic.
- **Need cross-OS rendering in the cloud (sidesteps macOS-vs-Linux)** → Percy.

This skill covers the built-in flow. For the third-party services, follow their docs.

## Step 1: write the visual test

```typescript
// tests/visual/home.visual.spec.ts
import { test, expect } from "@playwright/test";

test("home page", async ({ page }) => {
  await page.goto("/");
  // Always wait for the page to be visually stable BEFORE the screenshot.
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();

  await expect(page).toHaveScreenshot("home.png", {
    fullPage: true,
    mask: [
      page.locator("[data-testid='timestamp']"),
      page.locator(".live-counter"),
      page.locator(".user-avatar"),
    ],
    animations: "disabled",
    maxDiffPixels: 100,
  });
});
```

Key options:

- **`mask`** - locators whose pixels are replaced with magenta blocks before comparison. Use for volatile regions (timestamps, counters, avatars, ads).
- **`animations: "disabled"`** - freezes CSS animations and the text-input caret. The default in modern Playwright versions; explicit is fine.
- **`maxDiffPixels`** - absolute pixel-count tolerance. Unset by default.
- **`threshold`** - 0 to 1, YIQ pixelmatch sensitivity. Default 0.2. Lower = stricter.
- **`stylePath`** - inject CSS before capture (useful to hide volatile elements without DOM-level masking).
- **`fullPage`** - capture beyond the viewport.

## Step 2: a dedicated `visual` project (load-bearing)

This is where the macOS-vs-Linux gotcha lives. **Snapshot baselines from your dev macOS will not match CI Linux.** Solve it with a dedicated project that runs only on Linux, with baselines committed only from CI artifacts.

```typescript
// playwright.config.ts (excerpt)
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  projects: [
    // ... existing functional projects ...
    {
      name: "visual",
      testMatch: /.*\.visual\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      // Only run when we explicitly opt in - avoids cross-OS baseline drift in dev.
      // Two equivalent ways to express "skip unless RUN_VISUAL is set":
      //   testIgnore: process.env.RUN_VISUAL ? undefined : ['**'],   // official option
      //   grep: process.env.RUN_VISUAL ? undefined : /__never__/,    // sentinel pattern
      testIgnore: process.env.RUN_VISUAL ? undefined : ["**"],
    },
  ],
});
```

Locally: `RUN_VISUAL=1 npx playwright test --project=visual`. CI: set `RUN_VISUAL=1` only on Linux runners.

## Step 3: the baseline workflow

1. Developer pushes a UI change.
2. CI runs `npx playwright test --project=visual` and fails on diff.
3. Developer opens the HTML report (`playwright-report/index.html`) or the trace, reviews the diff (expected / actual / diff side-by-side).
4. If the diff is intentional, developer runs `RUN_VISUAL=1 npx playwright test --project=visual --update-snapshots` **on a Linux machine** (or downloads the CI artifact and commits the new PNG).
5. PR approver re-runs CI; baselines now match.

**Never auto-update snapshots in CI.** That defeats the purpose.

## Step 4: snapshot file layout

Snapshots go to `<testfile>-snapshots/<name>-<projectName>-<platform>.png`. Example: `tests/visual/home.visual.spec.ts-snapshots/home-visual-linux.png`.

Commit the `linux` PNGs only. Add to `.gitignore`:

```gitignore
# Reject non-Linux snapshots (commit only what CI produces)
**/*-snapshots/*-darwin.png
**/*-snapshots/*-darwin-arm64.png
**/*-snapshots/*-win32.png
```

## Step 5: CI workflow snippet

```yaml
# .github/workflows/visual.yml
name: visual
on:
  pull_request:
    paths:
      - "src/**"
      - "tests/visual/**"
      - "playwright.config.ts"
jobs:
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium
      - run: RUN_VISUAL=1 npx playwright test --project=visual --reporter=html
        env:
          RUN_VISUAL: "1"
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-visual-report
          path: playwright-report/
          retention-days: 14
```

## Common mistakes to refuse

- **Committing macOS baselines** - they will not match CI Linux. Always regenerate from a Linux runner.
- **Forgetting `mask:` for volatile regions** - timestamps, counters, avatars cause every run to fail. Mask them out.
- **Screenshot taken before the page is stable** - flake. Always assert the page reached its final state first (`await expect(...).toBeVisible()`).
- **`maxDiffPixels: 1000`** to "stop the flake" - hides real regressions. Lower the tolerance, fix the source of variance.
- **`threshold: 1`** ditto - that's "anything passes."
- **`fullPage: true` on a long scrolling page with lazy-loaded content** - bottom of the page is unloaded when the screenshot is taken. Either scroll-and-wait first, or screenshot the visible region only.
- **Auto-update in CI** - defeats the purpose. Only update locally (or by downloading the CI artifact) after a human eyeballs the diff.

## When to reach for a third-party service

The built-in is good when:

- You have one OS (Linux CI) and one browser project for visuals.
- The team can review diffs in the HTML report.
- You don't need a PR-attached approval flow.

Reach for **Argos** when you want a polished review UI free; **Chromatic** when you have a Storybook design system; **Percy** when you need cross-OS rendering in the cloud (sidesteps the baseline-OS problem entirely).

## Reference

- [Visual comparisons](https://playwright.dev/docs/test-snapshots)
- [SnapshotAssertions API](https://playwright.dev/docs/api/class-snapshotassertions)
