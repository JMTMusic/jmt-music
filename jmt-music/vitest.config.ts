import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Minimal Vitest setup, scoped intentionally to business logic and server-action units
 * (lib/**, app/**) — not component or full integration testing. Originally lib-only (see
 * Growth Engine Foundation implementation plan, Section 15); broadened for Project Setup
 * Stage 3 to also cover app/control-center/projects/setup-actions.test.ts, the first
 * server-action-layer test in this codebase (mocked Supabase/role/repository, no live DB).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Test-only: "server-only" resolves in `next build` via Next's own internal webpack
      // alias (node_modules/next/dist/compiled/server-only), not as an installed npm
      // dependency, so there's nothing for plain Node/Vitest to resolve without this. Does
      // NOT touch next.config or production resolution — see test/stubs/server-only.ts.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts")
    }
  }
});
