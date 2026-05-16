export type RequiredEnvKey =
  | "VITE_CLERK_PUBLISHABLE_KEY"
  | "VITE_CONVEX_URL"
  | "VITE_CONVEX_SITE_URL";

export type AppEnvConfig = {
  convexSiteUrl: string;
  convexUrl: string;
  clerkPublishableKey: string;
};
