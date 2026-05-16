"use client";

import { type ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/react";
import { envConfig } from "@/config/env";

const convex = new ConvexReactClient(envConfig.convexUrl);

// Canonical provider wrapper for Convex + Clerk composition in this template.
export default function ConvexClerkProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
