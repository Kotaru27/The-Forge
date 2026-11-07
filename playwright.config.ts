import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 50_000,
  // Canvas/video suites can saturate shared GitHub runners. Keep CI deterministic.
  workers: process.env.CI ? 1 : undefined,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://127.0.0.1:4173/The-Forge/', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    // Vite reads its base setting at preview startup as well as during build.
    env: { FORGE_BASE_PATH: '/The-Forge/' },
    url: 'http://127.0.0.1:4173/The-Forge/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  reporter: process.env.CI ? 'github' : 'list',
});
