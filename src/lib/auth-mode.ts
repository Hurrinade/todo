import { createContext, useContext } from "react";

export const NativeAccountContext = createContext(false);

export type GoogleSignIn = () => Promise<{
  error?: { message?: string } | null;
}>;

export const GoogleSignInContext = createContext<GoogleSignIn | null>(null);

export function useNativeAccount() {
  return useContext(NativeAccountContext);
}
