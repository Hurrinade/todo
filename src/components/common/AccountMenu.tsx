import { useRef, useState } from "react";
import { LogOut, Settings } from "lucide-react";
import AccountSettingsDialog from "@/components/auth/AccountSettingsDialog";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { authClient } from "@/lib/auth-client";

export default function AccountMenu() {
  const { data: session } = authClient.useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  async function signOut() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError("Could not sign out. Try again.");
      } else {
        setMenuOpen(false);
        setSettingsOpen(false);
      }
    } catch {
      setError("Could not sign out. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="mobile"
            className="max-w-full truncate"
            aria-label="Account menu"
          >
            <span className="truncate">
              {session.user.name || session.user.email}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="auth-theme dark w-64 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg"
          onCloseAutoFocus={(event) => {
            if (settingsOpen) {
              event.preventDefault();
            }
          }}
        >
          <p className="truncate text-sm">{session.user.email}</p>
          <Button
            variant="ghost"
            className="h-11 w-full justify-start"
            disabled={pending}
            onClick={() => {
              setMenuOpen(false);
              setSettingsOpen(true);
            }}
          >
            <Settings />
            Settings
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            variant="ghost"
            className="h-11 w-full justify-start"
            disabled={pending}
            onClick={() => void signOut()}
          >
            <LogOut />
            {pending ? "Signing out..." : "Sign out"}
          </Button>
        </PopoverContent>
      </Popover>
      <AccountSettingsDialog
        key={session.user.id}
        user={session.user}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onReturnFocus={() => triggerRef.current?.focus()}
      />
    </>
  );
}
