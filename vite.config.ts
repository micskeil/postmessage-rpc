import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "./dist",
    target: "esnext",
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "./src/main.js"),
      name: "pluginInterface",
      fileName: (format) => {
        if (format === "umd") return "pluginInterface.cjs";
        return "pluginInterface.js";
      },
    },
  },
});
