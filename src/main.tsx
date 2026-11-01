import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import ConvexBetterAuthProvider from "@/context/convex/ConvexBetterAuthProvider";
import { ModalProvider } from "@/context/modal/ModalProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "@/App.tsx";
import "@/index.css";

const root = createRoot(document.getElementById("root")!);

function startApp() {
  root.render(
    <StrictMode>
      <ConvexBetterAuthProvider>
        <BrowserRouter>
          <TooltipProvider>
            <ModalProvider>
              <App />
            </ModalProvider>
          </TooltipProvider>
        </BrowserRouter>
      </ConvexBetterAuthProvider>
    </StrictMode>,
  );
}

startApp();
