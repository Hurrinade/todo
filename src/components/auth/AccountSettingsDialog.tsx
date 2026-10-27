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
        className="auth-theme dark max-w-2xl rounded-lg bg-background text-foreground"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Edit your profile and manage MCP keys.
        </DialogDescription>
        <SettingsContent key={user.id} user={user} />
      </DialogContent>
    </Dialog>
  );
}

function SettingsContent({ user }: { user: SettingsUser }) {
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
        className="gap-5 md:grid md:grid-cols-[8rem_minmax(0,1fr)] md:gap-6"
      >
        <TabsList
          aria-label="Account settings"
          className="h-auto w-full justify-start gap-5 rounded-none border-b bg-transparent p-0 md:flex-col md:items-stretch md:gap-1 md:self-start md:border-0"
        >
          {[
            ["profile", "Profile"],
            ["mcp", "MCP keys"],
          ].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="min-h-11 flex-none justify-start rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none md:border-b-0 md:border-l-2 md:px-3"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="profile" className="min-w-0">
          <ProfileSettings name={user.name} email={user.email} />
        </TabsContent>
        <TabsContent value="mcp" className="min-w-0">
          <McpKeySettings userId={user.id} />
        </TabsContent>
      </Tabs>
    </QueryClientProvider>
  );
}
