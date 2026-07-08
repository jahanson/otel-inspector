import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import styles from "./styles.css";

const style = document.createElement("style");
style.textContent = styles;
document.head.append(style);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
