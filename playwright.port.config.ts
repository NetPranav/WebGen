// Local only, not committed: the normal config on port 3300, because :3000 is taken by another project's dev server.
import base from "./playwright.config";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  ...base,
  workers: 4,
  use: { ...base.use, baseURL: "http://localhost:3300" },
  webServer: {
    command: "NEXT_PUBLIC_ENABLE_LABS=1 npm run build && npm run start -- -p 3300",
    url: "http://localhost:3300",
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
