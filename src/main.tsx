import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";
import { registerSW } from "virtual:pwa-register";

// auto register the service worker and update in background
registerSW({
  immediate: true,
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error('Root element "#root" not found');

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);