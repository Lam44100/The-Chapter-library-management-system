import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "on",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
