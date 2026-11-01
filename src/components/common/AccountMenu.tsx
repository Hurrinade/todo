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

// Same padding and icon size on every row so icons and labels line up.
const menuItemClassName =
  "h-11 w-full justify-start gap-2.5 px-2.5 pointer-fine:h-9 [&_svg]:size-4";

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
          className="w-64 max-w-[calc(100vw-2rem)] gap-0 rounded-lg p-1.5"
          onCloseAutoFocus={(event) => {
            if (settingsOpen) {
              event.preventDefault();
            }
          }}
        >
          <div className="min-w-0 px-2.5 py-2">
            <p className="truncate">
              {session.user.name || session.user.email}
            </p>
            {session.user.name && (
              <p className="truncate text-xs text-muted-foreground">
                {session.user.email}
              </p>
            )}
          </div>
          <div className="mx-1 mb-1 h-px bg-border/50" />
          <Button
            variant="ghost"
            className={menuItemClassName}
            disabled={pending}
            onClick={() => {
              setMenuOpen(false);
              setSettingsOpen(true);
            }}
          >
            <Settings />
            Settings
          </Button>
          <Button
            variant="ghost"
            className={menuItemClassName}
            disabled={pending}
            onClick={() => void signOut()}
          >
            <LogOut />
            {pending ? "Signing out..." : "Sign out"}
          </Button>
          {error && (
            <p role="alert" className="px-2.5 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
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
