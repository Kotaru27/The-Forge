import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 50_000,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://127.0.0.1:4173/The-Forge/', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/The-Forge/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  reporter: process.env.CI ? 'github' : 'list',
});
