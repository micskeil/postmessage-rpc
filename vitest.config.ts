/// <reference types="vitest" />
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {},
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/*.{test,spec}.ts"],
    // globalSetup: "./src/tests/vitest-global.setup.ts",
    // setupFiles: ["./src/tests/vitest.setup.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html"],
      exclude: [
        ...configDefaults.exclude,
        "*.{js,mjs}",
        "**/dist/**",
        "**/examples/**",
        "**/docs-api/**",
        "**/generated/**",
        "**/bin/**",
        "**/interfaces/**",
        "**/mocks/**",
        "**/test/**",
        "**/*.{spec,test,d}.ts",
      ],
      all: true,
      clean: true,
    },
    snapshotFormat: {
      escapeString: false,
    },
  },
});
