import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // Ensure React JSX runtimes resolve correctly in all environments
      {
        find: "react/jsx-dev-runtime",
        replacement: path.resolve(__dirname, "node_modules/react/jsx-dev-runtime.js"),
      },
      {
        find: "react/jsx-runtime",
        replacement: path.resolve(__dirname, "node_modules/react/jsx-runtime.js"),
      },
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
});