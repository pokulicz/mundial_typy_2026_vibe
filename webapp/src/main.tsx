import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA install (add-to-home-screen)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration errors */
    });
  });
}
