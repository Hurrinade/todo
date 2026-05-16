import type { HomeIntroContent } from "@/types";

const defaultHomeIntro: HomeIntroContent = {
  title: "Home Template Page",
  description:
    "This authenticated example page shows how route-specific page files can keep their own hooks and types in matching home folders.",
  previewMessage:
    "This dialog is rendered through the global modal host so future pages can open shared modals from anywhere in the app.",
};

// Route-scoped hooks can live in src/hooks/<route-segment>/ and stay small.
export function useHome() {
  return defaultHomeIntro;
}
