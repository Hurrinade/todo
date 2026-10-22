import { useId, useState, type FormEvent, type ReactElement } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { useNetworkStore } from "@/stores";

type AuthMode = "sign-in" | "sign-up";

export default function AuthDialog({
  children,
  initialMode = "sign-in",
}: {
  children: ReactElement;
  initialMode?: AuthMode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="auth-theme dark max-w-sm rounded-lg bg-background text-foreground">
        <AuthForm
          initialMode={initialMode}
          onSignedIn={() => {
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AuthForm({
  initialMode,
  onSignedIn,
}: {
  initialMode: AuthMode;
  onSignedIn: () => void;
}) {
  const id = useId();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useNetworkStore((state) => state.isOnline);

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !isOnline) {
      return;
    }
    setPending(true);
    setError(null);

    try {
      if (codeSent) {
        // Email OTP creates a persistent session by default. It has no rememberMe toggle.
        const result = await authClient.signIn.emailOtp({
          email: email.trim(),
          otp,
          ...(mode === "sign-up" ? { name: name.trim() } : {}),
        });
        if (result.error) {
          setError(result.error.message ?? "The code could not be verified.");
          return;
        }
        onSignedIn();
      } else {
        const result = await authClient.emailOtp.sendVerificationOtp({
          email: email.trim(),
          type: "sign-in",
        });
        if (result.error) {
          setError(result.error.message ?? "The code could not be sent.");
          return;
        }
        setCodeSent(true);
      }
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function signInWithGoogle() {
    if (pending || !isOnline) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        // Return to the invite or page that opened this dialog.
        callbackURL: window.location.href,
      });
      if (result.error) {
        setError(result.error.message ?? "Google sign-in could not start.");
      }
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DialogTitle className="sr-only">
        {mode === "sign-in" ? "Sign in to RiTodo" : "Create a RiTodo account"}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Use a code sent to your email or continue with Google.
      </DialogDescription>
      <Tabs
        value={mode}
        onValueChange={(value) => {
          setMode(value === "sign-up" ? "sign-up" : "sign-in");
          setError(null);
        }}
      >
        <TabsList className="h-auto w-full justify-start gap-5 rounded-none border-b bg-transparent p-0 pr-7">
          <TabsTrigger
            value="sign-in"
            disabled={pending || codeSent}
            className="rounded-none border-0 border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Sign in
          </TabsTrigger>
          <TabsTrigger
            value="sign-up"
            disabled={pending || codeSent}
            className="rounded-none border-0 border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Create account
          </TabsTrigger>
        </TabsList>
        <TabsContent value={mode} className="space-y-5 pt-3">
          <form
            onSubmit={submitEmail}
            className="space-y-4"
            aria-busy={pending}
          >
            {mode === "sign-up" && !codeSent && (
              <div className="space-y-2">
                <label htmlFor={`${id}-name`}>Name</label>
                <Input
                  id={`${id}-name`}
                  autoComplete="name"
                  value={name}
                  maxLength={100}
                  onChange={(event) => {
                    setName(event.target.value);
                  }}
                  disabled={pending}
                  className="h-11 rounded-md bg-background"
                />
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor={`${id}-email`}>Email</label>
              <Input
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                disabled={pending || codeSent}
                className="h-11 rounded-md bg-background"
              />
            </div>
            {codeSent && (
              <div className="space-y-2">
                <label htmlFor={`${id}-code`}>Email code</label>
                <Input
                  id={`${id}-code`}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value);
                  }}
                  disabled={pending}
                  aria-describedby={`${id}-hint`}
                  className="h-11 rounded-md bg-background font-mono tracking-widest"
                />
                <p id={`${id}-hint`} className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your email. It expires in 5
                  minutes.
                </p>
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {!isOnline && (
              <p role="status">Connect to the internet to sign in.</p>
            )}
            <Button
              type="submit"
              disabled={pending || !isOnline}
              className="h-11 w-full"
            >
              {pending
                ? "Please wait..."
                : codeSent
                  ? "Verify and continue"
                  : "Send email code"}
            </Button>
            {codeSent && (
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full"
                disabled={pending}
                onClick={() => {
                  setCodeSent(false);
                  setOtp("");
                  setError(null);
                }}
              >
                Change email or request a new code
              </Button>
            )}
          </form>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full bg-background dark:bg-background"
            disabled={pending || !isOnline}
            onClick={() => void signInWithGoogle()}
          >
            Continue with Google
          </Button>
        </TabsContent>
      </Tabs>
    </>
  );
}
