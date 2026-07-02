import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Each file gets its own process so module mocks don't bleed between suites
    pool: "forks",
  },
});
