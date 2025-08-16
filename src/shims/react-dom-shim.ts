import ReactDOMDefault, * as ReactDOMAll from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import type { ReactNode } from "react";

// Re-export all named exports from react-dom.
export * from "react-dom";

// Export the default export from react-dom so that libraries expecting a default get the actual module.
export default ReactDOMDefault;

// Export createPortal from the default export.
export const createPortal = ReactDOMDefault.createPortal;

/**
 * Compatibility for libraries that still call ReactDOM.render in React 18+.
 * This function proxies to createRoot(container).render(element) and returns the root.
 */
export function render(
  element: ReactNode,
  container: Element | DocumentFragment,
  callback?: () => void
) {
  const root = ReactDOMClient.createRoot(container as Element);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root.render(element as any);
  if (typeof callback === "function") callback();
  return root;
}