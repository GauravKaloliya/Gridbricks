import fs from "node:fs";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const frontendDir = process.cwd();
const backendDir = path.resolve(frontendDir, "../backend");
const venvPython = path.join(backendDir, ".venv/bin/python");
const pythonBin =
  process.env.PYTHON_BIN ?? (fs.existsSync(venvPython) ? venvPython : "python");
const apiPort = 8001;
const webPort = 5174;
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: [
    {
      command: `${pythonBin} -m uvicorn app.main:app --host 127.0.0.1 --port ${apiPort}`,
      cwd: backendDir,
      url: `${apiBaseUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        DATA_MODE: "snapshot",
        ALLOWED_ORIGINS: `http://127.0.0.1:${webPort}`,
      },
    },
    {
      command: `npm run dev -- --port ${webPort} --strictPort`,
      cwd: frontendDir,
      url: `http://127.0.0.1:${webPort}`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_BASE_URL: apiBaseUrl,
      },
    },
  ],
});
