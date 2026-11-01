import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import type { authClient } from "@/lib/auth-client";
import ProfileSettings from "./ProfileSettings";
import McpKeySettings from "./McpKeySettings";

type SettingsUser = Pick<
  typeof authClient.$Infer.Session.user,
  "id" | "name" | "email"
>;

// Light backdrop so the app stays visible. McpKeySettings uses the same one.
const overlayClassName = "bg-black/20 backdrop-blur-none";

const tabs = [
  ["profile", "Profile"],
  ["mcp", "MCP keys"],
] as const;

/** Account settings. Centered dialog on desktop, full screen below the md breakpoint. */
export default function AccountSettingsDialog({
  user,
  open,
  onOpenChange,
  onReturnFocus,
}: {
  user: SettingsUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReturnFocus: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl content-start rounded-lg max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:border-0 max-md:px-4 max-md:pt-[calc(1rem+env(safe-area-inset-top))] max-md:pb-[calc(1rem+env(safe-area-inset-bottom))]"
        overlayClassName={overlayClassName}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        <div className="min-w-0 pr-10">
          <DialogTitle className="truncate">
            {user.name || user.email}
          </DialogTitle>
          <DialogDescription className="truncate">
            {user.email}
          </DialogDescription>
        </div>
        <SettingsContent
          key={user.id}
          user={user}
          onSaved={() => {
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function SettingsContent({
  user,
  onSaved,
}: {
  user: SettingsUser;
  onSaved: () => void;
}) {
  // The cache is scoped to the open dialog and discarded when it closes.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      }),
  );
  const isMobile = useIsMobile();

  return (
    <QueryClientProvider client={queryClient}>
      <Tabs
        defaultValue="profile"
        orientation={isMobile ? "horizontal" : "vertical"}
        className="min-w-0 gap-5 md:grid md:grid-cols-[8rem_minmax(0,1fr)] md:gap-6"
      >
        <TabsList
          aria-label="Account settings"
          className="h-auto w-full justify-start gap-5 rounded-none border-b border-border/50 bg-transparent p-0 md:flex-col md:items-stretch md:gap-0.5 md:self-start md:border-0"
        >
          {tabs.map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="-mb-px min-h-11 flex-none justify-start rounded-none border-b-2 border-transparent px-0 py-2 font-normal data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none md:mb-0 md:min-h-9 md:border-b-0 md:border-l-2 md:px-3"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="profile" className="min-w-0">
          <ProfileSettings
            name={user.name}
            email={user.email}
            onSaved={onSaved}
          />
        </TabsContent>
        <TabsContent value="mcp" className="min-w-0">
          <McpKeySettings userId={user.id} />
        </TabsContent>
      </Tabs>
    </QueryClientProvider>
  );
}
