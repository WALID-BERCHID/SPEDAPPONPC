import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./styles.css";
import App from "./App";

document.documentElement.dataset.theme = "system";

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).loadDemo = () => import("./lib/demo").then((m) => m.loadDemo());
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
