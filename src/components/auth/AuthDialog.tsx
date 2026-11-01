import { useState, type FormEvent, type ReactElement } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth-client";
import { getLastUsedEmail } from "@/lib/last-used-email";
import { useNetworkStore } from "@/stores";

type AuthMode = "sign-in" | "sign-up";
type PendingAction = "send" | "verify" | "google";

const CODE_LENGTH = 6;
const textLinkClassName =
  "inline-flex min-h-11 items-center text-foreground underline underline-offset-3 pointer-fine:min-h-6 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-50";

/** Wraps a trigger element and opens the Google or email-code sign-in dialog. */
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
      <DialogContent className="max-w-md rounded-lg">
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
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState(getLastUsedEmail);
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const isOnline = useNetworkStore((state) => state.isOnline);
  const pending = pendingAction != null;
  const disabled = pending || !isOnline;

  // Shared by the first send and "Send a new code". Returns true when sent.
  async function sendCode() {
    setPendingAction("send");
    setError(null);
    setResent(false);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
      });
      if (result.error) {
        setError(result.error.message ?? "The code could not be sent.");
        return false;
      }
      return true;
    } catch {
      setError("Could not connect. Please try again.");
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      return;
    }
    if (await sendCode()) {
      setCodeSent(true);
    }
  }

  async function resendCode() {
    if (disabled) {
      return;
    }
    if (await sendCode()) {
      setOtp("");
      setResent(true);
    }
  }

  async function verifyCode(code: string) {
    if (disabled) {
      return;
    }
    setPendingAction("verify");
    setError(null);
    setResent(false);
    try {
      // Email OTP creates a persistent session by default. It has no rememberMe toggle.
      const result = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: code,
        ...(mode === "sign-up" ? { name: name.trim() } : {}),
      });
      if (result.error) {
        setError(result.error.message ?? "The code could not be verified.");
        setOtp("");
        return;
      }
      onSignedIn();
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function signInWithGoogle() {
    if (disabled) {
      return;
    }
    setPendingAction("google");
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
      setPendingAction(null);
    }
  }

  const feedback = (
    <>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {!isOnline && <p role="status">You are offline.</p>}
    </>
  );

  if (codeSent) {
    return (
      <>
        <DialogTitle className="pr-8">Enter code</DialogTitle>
        <DialogDescription className="text-foreground">
          Sent to <span className="break-all">{email.trim()}</span>.{" "}
          <button
            type="button"
            className={textLinkClassName}
            disabled={pending}
            onClick={() => {
              setCodeSent(false);
              setOtp("");
              setError(null);
              setResent(false);
            }}
          >
            Change
          </button>
        </DialogDescription>
        <InputOTP
          aria-label="6-digit code"
          autoFocus
          maxLength={CODE_LENGTH}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otp}
          onChange={setOtp}
          onComplete={(code: string) => void verifyCode(code)}
          readOnly={pending}
          aria-busy={pending}
          containerClassName="w-full"
        >
          <InputOTPGroup className="w-full gap-2">
            {Array.from({ length: CODE_LENGTH }, (_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="h-13 min-w-0 flex-1 rounded-md border font-mono text-xl first:rounded-md last:rounded-md bg-card dark:bg-card"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        {feedback}
        {pendingAction === "verify" && <p role="status">Checking...</p>}
        {resent && <p role="status">New code sent.</p>}
        <div className="flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            className={textLinkClassName}
            disabled={disabled}
            onClick={() => void resendCode()}
          >
            Send a new code
          </button>
          <span className="text-muted-foreground">Expires in 5 min</span>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogTitle className="pr-8">
        {mode === "sign-in" ? "Sign in to RiTodo" : "Create account"}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Continue with Google or get a code by email.
      </DialogDescription>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={disabled}
        onClick={() => void signInWithGoogle()}
      >
        <img
          src="/google-g.svg"
          alt=""
          aria-hidden="true"
          width={20}
          height={20}
          className="size-5 shrink-0"
        />
        {pendingAction === "google"
          ? "Opening Google..."
          : "Continue with Google"}
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border/50" />
        or
        <span className="h-px flex-1 bg-border/50" />
      </div>
      <form
        onSubmit={(event) => void submitEmail(event)}
        className="space-y-3"
        aria-busy={pending}
      >
        {mode === "sign-up" && (
          <Input
            aria-label="Name"
            placeholder="Your name"
            autoComplete="name"
            value={name}
            maxLength={100}
            onChange={(event) => {
              setName(event.target.value);
            }}
            disabled={pending}
            className="h-11 rounded-md"
          />
        )}
        <div className="flex gap-2">
          <Input
            aria-label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            disabled={pending}
            className="h-11 min-w-0 flex-1 rounded-md"
          />
          <Button type="submit" disabled={disabled} className="h-11 px-4">
            {pendingAction === "send" ? "Sending..." : "Send code"}
          </Button>
        </div>
      </form>
      {feedback}
      <p className="text-xs text-muted-foreground">
        {mode === "sign-in" ? "New here?" : "Have an account?"}{" "}
        <button
          type="button"
          className={textLinkClassName}
          disabled={pending}
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError(null);
          }}
        >
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </>
  );
}
