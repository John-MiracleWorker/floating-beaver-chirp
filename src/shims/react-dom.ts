/* Shim for libraries that import { render } from 'react-dom' in React 18+ */
import * as ReactDOMOriginal from "react-dom";
export * from "react-dom";
export { default } from "react-dom";

import { createRoot } from "react-dom/client";

/* Provide a legacy-like render that uses createRoot under the hood.
   Types set to any to avoid conflicts with third-party expectations. */
export const render = ((element: any, container: any) => {
  const root = createRoot(container);
  root.render(element);
  return root;
}) as any;