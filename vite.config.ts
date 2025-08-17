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
      { find: "react/jsx-dev-runtime", replacement: "react/jsx-runtime" },
      { find: /^react$/, replacement: path.resolve(__dirname, "node_modules/react") },
      { find: /^react-dom\/client$/, replacement: path.resolve(__dirname, "node_modules/react-dom/client.js") },
    ],
  },
});