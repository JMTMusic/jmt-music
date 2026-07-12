// Test-only stub for the "server-only" sentinel package.
//
// "server-only" is not a direct npm dependency of this project (there is no
// node_modules/server-only, and it isn't in package.json/package-lock.json). Next.js
// vendors its own compiled copy at node_modules/next/dist/compiled/server-only and aliases
// the bare "server-only" specifier to it inside its own webpack build — which is why
// `import "server-only"` resolves fine in `next build` without ever being installed
// separately, and is exactly the intentional server-boundary guard this project relies on.
//
// Vitest runs modules directly under Node/Vite with no Next.js webpack build in front of
// it, so that alias doesn't exist and the bare specifier can't resolve at all. The real
// package's only behavior is a bundler-time throw-if-imported-client-side check, which has
// no meaning outside a bundler — so there is nothing to preserve here for tests. This stub
// is aliased in vitest.config.ts ONLY for the test runner; it contains no production logic,
// is never referenced by next.config, and never ships in any build output.
export {};
