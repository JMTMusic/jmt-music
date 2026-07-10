import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Minimal Vitest setup, scoped intentionally to pure business logic only
 * (lib/control-center/*.test.ts) — not component or integration testing.
 * See Growth Engine Foundation implementation plan, Section 15.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  }
});
