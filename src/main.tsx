import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import WeddingApp from "./WeddingApp";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WeddingApp />
  </StrictMode>,
);
