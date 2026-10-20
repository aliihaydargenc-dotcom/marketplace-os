import { defineConfig } from "@playwright/test";
import chromium from "@sparticuz/chromium";
import { prepareBrowser } from "./scripts/prepare-browser.mjs";
const bundled = process.env.BUNDLED_CHROMIUM === "1";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120000,
  expect: { timeout: 30000 },
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: bundled
      ? {
          executablePath: prepareBrowser(),
          args: chromium.args.filter(
            (arg) =>
              !["--disable-web-security", "--single-process"].includes(arg),
          ),
        }
      : {},
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run start -- --port 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: false,
        timeout: 30000,
      },
});
