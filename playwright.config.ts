import { defineConfig, devices } from "@playwright/test";

/**
 * ROADMAP Phase 4.1 — Real-Environment Browser E2E.
 * Runs against a production build (`next build && next start`), matching
 * the Definition of Done (ROADMAP §3): gates run in real environments, not
 * just locally. `webServer` builds once and reuses the server across all
 * three browser projects.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/**/*.spec.ts", "export-harness/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
