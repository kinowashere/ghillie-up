import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { hydrate } from "@/lib/store";
import "./style.css";

hydrate().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
