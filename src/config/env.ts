import type { AppEnvConfig, RequiredEnvKey } from "@/types";

const REQUIRED_ENV_KEYS: RequiredEnvKey[] = [
  "VITE_CLERK_PUBLISHABLE_KEY",
  "VITE_CONVEX_URL",
  "VITE_CONVEX_SITE_URL",
];

function getRequiredEnvValue(key: RequiredEnvKey): string {
  const value = import.meta.env[key];

  if (!value?.trim()) {
    throw new Error(
      `[env] Missing required environment variable "${key}". Set it in .env.local for local mode or .env.production for production mode.`,
    );
  }

  return value.trim();
}

for (const key of REQUIRED_ENV_KEYS) {
  getRequiredEnvValue(key);
}

export const envConfig: AppEnvConfig = {
  clerkPublishableKey: getRequiredEnvValue("VITE_CLERK_PUBLISHABLE_KEY"),
  convexUrl: getRequiredEnvValue("VITE_CONVEX_URL"),
  convexSiteUrl: getRequiredEnvValue("VITE_CONVEX_SITE_URL"),
};
