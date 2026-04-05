/// <reference types='vitest' />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "node:path";

export default defineConfig({
  root: __dirname,
  server: {
    port: 4200,
    host: true, // This allows access from any network interface
    // Or alternatively use: host: '0.0.0.0'
  },
  preview: {
    port: 4300,
    host: "localhost",
  },
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "assets"),
    },
  },
  define: {
    global: "globalThis",
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler", // Use modern Sass API
        // or alternatively:
        // silenceDeprecations: ['legacy-js-api']
      },
    },
  },
});
