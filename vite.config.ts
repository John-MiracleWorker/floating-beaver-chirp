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
      // Redirect any import of react-dom to the client ESM build
      { find: /^react-dom$/, replacement: path.resolve(__dirname, "node_modules/react-dom/client") },
      // Ensure explicit react-dom/client imports also resolve correctly
      { find: /^react-dom\/client$/, replacement: path.resolve(__dirname, "node_modules/react-dom/client") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});