import { useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { Languages, LogOut, Settings } from "lucide-react";
import AccountSettingsDialog from "@/components/auth/AccountSettingsDialog";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useT } from "@/hooks";
import { LANGUAGES } from "@/i18n";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/stores";

// Same padding and icon size on every row so icons and labels line up.
const menuItemClassName =
  "h-11 w-full justify-start gap-2.5 px-2.5 pointer-fine:h-9 [&_svg]:size-4";

export default function AccountMenu() {
  const user = useQuery(api.nativeAccount.me, {});
  const { signOut } = useAuthActions();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const t = useT();

  async function handleSignOut() {
    setPending(true);
    setError(null);
    try {
      await signOut();
      setMenuOpen(false);
      setSettingsOpen(false);
    } catch {
      setError(t.account.signOutFailed);
    } finally {
      setPending(false);
    }
  }

  if (!user) {
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
            aria-label={t.account.menu}
          >
            <span className="truncate">{user.name || user.email}</span>
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
            <p className="truncate">{user.name || user.email}</p>
            {user.name && (
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
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
            {t.settings.title}
          </Button>
          <Button
            variant="ghost"
            className={menuItemClassName}
            disabled={pending}
            onClick={() => void handleSignOut()}
          >
            <LogOut />
            {pending ? t.account.signingOut : t.account.signOut}
          </Button>
          <div className="mx-1 my-1 h-px bg-border/50" />
          <LanguagePicker />
          {error && (
            <p role="alert" className="px-2.5 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </PopoverContent>
      </Popover>
      <AccountSettingsDialog
        key={user.id}
        user={user}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onReturnFocus={() => triggerRef.current?.focus()}
      />
    </>
  );
}

// Each language is named in its own language, so it can be found either way.
const LANGUAGE_NAMES = { en: "English", hr: "Hrvatski" } as const;

function LanguagePicker() {
  const t = useT();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return (
    <div className="flex flex-col gap-1.5 px-2.5 py-2">
      <p className="flex items-center gap-2.5 text-sm [&_svg]:size-4">
        <Languages aria-hidden="true" />
        {t.account.language}
      </p>
      <div
        role="group"
        aria-label={t.account.language}
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
      >
        {LANGUAGES.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant="ghost"
            lang={option}
            aria-pressed={language === option}
            onClick={() => {
              setLanguage(option);
            }}
            className={cn(
              "h-9 pointer-fine:h-7",
              language === option &&
                "bg-card text-card-foreground shadow-sm hover:bg-card",
            )}
          >
            {LANGUAGE_NAMES[option]}
          </Button>
        ))}
      </div>
    </div>
  );
}
