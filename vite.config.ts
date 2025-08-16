import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: [
      // Keep only our src alias—no more react-dom shims
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});