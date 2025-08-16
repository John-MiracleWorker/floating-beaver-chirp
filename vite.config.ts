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
      // Ensure react-dom/client resolves to the actual client entry
      { find: "react-dom/client", replacement: path.resolve(__dirname, "node_modules/react-dom/client.js") },
      // Shim react-dom to provide a safe render() for legacy consumers
      { find: "react-dom", replacement: path.resolve(__dirname, "./src/shims/react-dom-shim.ts") },
    ],
  },
});