import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { clearMocks: true, exclude: ["e2e/**", "node_modules/**"] },
});
