//frontend/vite.config.js
// Configuración de Vite para el frontend.

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Configuración de Vite para el proyecto Auto Colombia Frontend.
 * @type {import('vite').UserConfig}
 * @see https://vite.dev/config/
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    reporters: ["verbose"],
    include: ["./test/**/*.test.{js,jsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "test/",
        "**/*.test.{js,jsx}",
        "src/setupTests.js",
        "src/main.jsx",
        "src/App.jsx",
        "src/routes/",
        "src/vite-env.d.ts",
      ],
    },
  },
});
