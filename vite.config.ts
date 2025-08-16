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
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // Route bare 'react-dom' imports to our shim (avoid matching subpaths like 'react-dom/client')
      { find: /^react-dom$/, replacement: path.resolve(__dirname, "./src/shims/react-dom-shim.ts") },
    ],
  },
});