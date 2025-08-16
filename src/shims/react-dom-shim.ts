import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import type { ReactNode } from "react";

export default ReactDOM;
export const createPortal = ReactDOM.createPortal;

/**
 * For compatibility with libraries that still call ReactDOM.render in React 18+.
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