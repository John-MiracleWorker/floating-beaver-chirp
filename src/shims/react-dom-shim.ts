export * from "react-dom/index";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

/**
 * Compatibility for libraries that still call ReactDOM.render in React 18+.
 * Proxies to createRoot(container).render(element) and returns the root.
 */
export function render(
  element: ReactNode,
  container: Element | DocumentFragment,
  callback?: () => void
) {
  const root = createRoot(container as Element);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root.render(element as any);
  if (typeof callback === "function") callback();
  return root;
}