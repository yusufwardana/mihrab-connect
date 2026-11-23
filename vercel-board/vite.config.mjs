import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
    // Hanya untuk verifikasi lokal: /api/board diteruskan ke server fixture
    // (node /tmp/mock-api.js). Di Vercel, /api/board dilayani function asli.
    proxy: {
      "/api/board": "http://localhost:8787",
    },
  },
});
