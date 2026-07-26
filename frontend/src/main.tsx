import React from "react";
import ReactDOM from "react-dom/client";
import Root from "./Root";
import "./index.css";
import { initGA } from "./utils/analytics";

initGA();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
