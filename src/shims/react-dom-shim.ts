import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import type { ReactNode } from "react";

const render = (element: ReactNode, container: Element, callback?: () => void) => {
  const root = ReactDOMClient.createRoot(container);
  root.render(element);
  if (typeof callback === "function") callback();
  return root;
};

export { render, createPortal } from "react-dom";
export * from "react-dom/client";
export default ReactDOM;