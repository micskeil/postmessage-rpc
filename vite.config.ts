import path from "path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  // Library build mode (npm run build)
  if (mode === "production" || process.env.BUILD_LIB) {
    return {
      build: {
        outDir: "./dist",
        target: "esnext",
        sourcemap: true,
        lib: {
          entry: path.resolve(__dirname, "./src/main.ts"),
          name: "pluginInterface",
          fileName: (format) => {
            if (format === "umd") return "pluginInterface.cjs";
            return "pluginInterface.js";
          },
        },
      },
    };
  }

  // Development mode (npm run dev)
  return {
    root: "./",
    publicDir: "public",
    server: {
      port: 8765,
      open: "/",
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
