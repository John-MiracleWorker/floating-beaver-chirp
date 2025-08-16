import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import type { ReactNode } from "react";

export * from "react-dom";

// Provide a default export so that libraries importing ReactDOM as a default get the correct object.
export default ReactDOM;

// Explicitly export createPortal.
export const createPortal = ReactDOM.createPortal;

/**
 * Compatibility for libraries that still call ReactDOM.render in React 18+.
 * Proxies to createRoot(container).render(element) and returns the root.
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