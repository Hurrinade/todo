import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import AuthProvider from "@/context/convex/AuthProvider";
import { ModalProvider } from "@/context/modal/ModalProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "@/App.tsx";
import "@/index.css";

const root = createRoot(document.getElementById("root")!);

function startApp() {
  root.render(
    <StrictMode>
      <AuthProvider>
        <BrowserRouter>
          <TooltipProvider>
            <ModalProvider>
              <App />
            </ModalProvider>
          </TooltipProvider>
        </BrowserRouter>
      </AuthProvider>
    </StrictMode>,
  );
}

startApp();
