import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      exclude: [...configDefaults.coverage.exclude, "**/von-network/**"],
    },
    exclude: [
      ...configDefaults.exclude,
      "**/__tests__/__data__/**",
      "**/von-network/**",
    ],
  },
});
