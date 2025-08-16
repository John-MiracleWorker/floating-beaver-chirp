import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react-dom": path.resolve(__dirname, "./src/shims/react-dom.ts"),
      "react-dom/client": path.resolve(__dirname, "./src/shims/react-dom.ts"),
    },
  },
}));