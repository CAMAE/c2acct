import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The link inventory guard crawls a running standalone; it runs through `pnpm guard:doors`
    // (validate-launch step after build), never silently inside the plain unit run.
    exclude: [...(process.env.LINK_INVENTORY_BASE_URL ? [] : ["tests/link-inventory.contract.test.ts"]), "**/node_modules/**"],
    passWithNoTests: false,
  },
});
