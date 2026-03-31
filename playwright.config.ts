import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? "3001");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? `bash scripts/run-playwright-dev.sh ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
