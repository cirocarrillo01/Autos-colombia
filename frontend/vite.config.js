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
});