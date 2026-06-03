import { defineConfig } from "vitest/config";

// Unit tests cover the pure logic (date math, time math) — no DOM needed.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
