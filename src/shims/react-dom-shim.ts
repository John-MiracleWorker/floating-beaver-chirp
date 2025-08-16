import ReactDOM from "../../node_modules/react-dom";
import * as ReactDOMClient from "../../node_modules/react-dom/client";
import type { ReactNode } from "react";

export default ReactDOM;
export const createPortal = ReactDOM.createPortal;

/**
 * Compatibility for libraries that still call ReactDOM.render in React 18+.
 * This proxy calls createRoot(container).render(element) and returns the root.
 */
export function render(
  element: ReactNode,
  container: Element | DocumentFragment,
  callback?: () => void
) {
  const root = ReactDOMClient.createRoot(container as Element);
  root.render(element);
  if (typeof callback === "function") callback();
  return root;
}