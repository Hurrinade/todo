import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/react";
import { envConfig } from "@/config/env";
import ConvexClerkProvider from "@/context/convex/ConvexClerkProvider";
import { ModalProvider } from "@/context/modal/ModalProvider";
import App from "@/App.tsx";
import "@/index.css";

const root = createRoot(document.getElementById("root")!);
const queryClient = new QueryClient();

async function startApp() {
  root.render(
    <StrictMode>
      <ClerkProvider
        publishableKey={envConfig.clerkPublishableKey}
        appearance={{
          variables: {
            colorPrimary: "var(--color-primary)",
            colorBackground: "var(--color-background)",
            colorForeground: "var(--color-foreground)",
            colorPrimaryForeground: "var(--color-primary-foreground)",
            colorMutedForeground: "var(--color-muted-foreground)",
            colorInputForeground: "var(--color-foreground)",
            colorDanger: "var(--color-destructive)",
            colorNeutral: "var(--color-foreground)",
          },
        }}
      >
        <ConvexClerkProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <ModalProvider>
                <App />
              </ModalProvider>
            </BrowserRouter>
          </QueryClientProvider>
        </ConvexClerkProvider>
      </ClerkProvider>
    </StrictMode>,
  );
}

startApp();
