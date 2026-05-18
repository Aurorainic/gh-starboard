import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import { LanguageProvider } from "@/i18n/context";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </LanguageProvider>
  </React.StrictMode>
);
