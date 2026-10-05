/// <reference types='vitest' />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "node:path";

export default defineConfig(({ mode }) => {
  // Production bundles must never be able to talk to a local Auth Emulator.
  if (mode === 'production' && loadEnv(mode, __dirname, 'VITE_').VITE_FIREBASE_AUTH_EMULATOR_URL) {
    throw new Error('VITE_FIREBASE_AUTH_EMULATOR_URL must not be set for production builds.');
  }
  return {
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
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
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
};
});
