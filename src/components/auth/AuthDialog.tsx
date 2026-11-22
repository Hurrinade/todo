import { useState, type FormEvent, type ReactElement } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  useOauth,
  useSignInWithGoogle,
} from "@convex-dev/auth/methods/google/react";
import { ConvexError } from "convex/values";

import { api } from "@convex/_generated/api";
import { USE_EMAIL_CODE } from "@convex/shared/googleSignIn";
import { EMAIL_CODE_LENGTH } from "@convex/shared/emailSignIn";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getLastUsedEmail } from "@/lib/last-used-email";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useT } from "@/hooks";
import { useNetworkStore } from "@/stores";

const textLinkClassName =
  "inline-flex min-h-11 items-center text-foreground underline underline-offset-3 pointer-fine:min-h-6 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-50";

export default function AuthDialog({
  children,
  initialMode = "sign-in",
  openOnGoogleError = false,
}: {
  children: ReactElement;
  initialMode?: "sign-in" | "sign-up";
  openOnGoogleError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { flowError } = useOauth();
  const [dismissed, setDismissed] = useState<typeof flowError>(null);
  const googleError =
    flowError !== dismissed && flowError?.error !== "ACCESS_DENIED"
      ? flowError
      : null;
  const t = useT();

  function onOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      setDismissed(flowError);
    }
  }

  const googleMessage = googleError
    ? googleError.error === "OTHER_ERROR" &&
      googleError.cause instanceof ConvexError &&
      googleError.cause.data === USE_EMAIL_CODE
      ? t.auth.useEmailCode
      : t.auth.googleNotStarted
    : null;

  return (
    <Dialog
      open={open || (openOnGoogleError && googleError != null)}
      onOpenChange={onOpenChange}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md rounded-lg">
        <AuthForm
          onSignedIn={() => {
            onOpenChange(false);
          }}
          title={
            initialMode === "sign-up"
              ? t.auth.createAccount
              : t.auth.signInTitle
          }
          googleMessage={googleMessage}
        />
      </DialogContent>
    </Dialog>
  );
}

function AuthForm({
  title,
  googleMessage,
  onSignedIn,
}: {
  title: string;
  googleMessage: string | null;
  onSignedIn: () => void;
}) {
  const [email, setEmail] = useState(getLastUsedEmail);
  const [challenge, setChallenge] = useState<{
    challengeId: Id<"emailSignInCodes">;
    browserSecret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(googleMessage);
  const [pendingAction, setPendingAction] = useState<
    "send" | "verify" | "google" | null
  >(null);
  const sendEmailCode = useMutation(api.emailSignInCodes.send);
  const verifyEmailCode = useMutation(api.emailSignInCodes.verify);
  const { setSession } = useAuthActions();
  const { signIn } = useSignInWithGoogle(api.nativeAuth);
  const isOnline = useNetworkStore((state) => state.isOnline);
  const t = useT();
  const pending = pendingAction != null;
  const disabled = pending || !isOnline;

  async function sendCode(resend: boolean) {
    if (disabled) {
      return;
    }
    setPendingAction("send");
    setError(null);
    setResent(false);
    try {
      const result = await sendEmailCode({ email: email.trim() });
      if (!result.success) {
        setError(
          result.error === "RATE_LIMITED"
            ? t.auth.codeRateLimited
            : t.auth.codeNotSent,
        );
        return;
      }
      setChallenge({
        challengeId: result.challengeId,
        browserSecret: result.browserSecret,
      });
      setCode("");
      setResent(resend);
    } catch {
      setError(t.auth.codeNotSent);
    } finally {
      setPendingAction(null);
    }
  }

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendCode(false);
  }

  async function verifyCode(codeToVerify: string) {
    if (disabled || !challenge) {
      return;
    }
    setPendingAction("verify");
    setError(null);
    setResent(false);
    try {
      const result = await verifyEmailCode({
        ...challenge,
        code: codeToVerify,
      });
      if (result.status === "error") {
        setError(
          result.error === "CODE_EXPIRED"
            ? t.auth.codeExpired
            : t.auth.codeNotVerified,
        );
        setCode("");
        return;
      }
      await setSession(result.tokens);
      onSignedIn();
    } catch {
      setCode("");
      setError(t.auth.codeNotVerified);
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
      const result = await signIn();
      if (result.status === "error") {
        setError(t.auth.googleNotStarted);
        setPendingAction(null);
      }
    } catch {
      setError(t.auth.googleNotStarted);
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
      {!isOnline && <p role="status">{t.common.offline}</p>}
    </>
  );

  if (challenge) {
    return (
      <>
        <DialogTitle className="pr-8">{t.auth.enterCode}</DialogTitle>
        <DialogDescription className="break-words text-foreground">
          {t.auth.codeSentTo(email.trim())}{" "}
          <button
            type="button"
            className={textLinkClassName}
            disabled={pending}
            onClick={() => {
              setChallenge(null);
              setCode("");
              setError(null);
              setResent(false);
            }}
          >
            {t.auth.changeEmail}
          </button>
        </DialogDescription>
        <InputOTP
          aria-label={t.auth.codeLabel}
          autoFocus
          maxLength={EMAIL_CODE_LENGTH}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={setCode}
          onComplete={(value: string) => void verifyCode(value)}
          disabled={!isOnline}
          readOnly={pending}
          aria-busy={pending}
          containerClassName="w-full"
        >
          <InputOTPGroup className="w-full gap-2">
            {Array.from({ length: EMAIL_CODE_LENGTH }, (_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="h-13 min-w-0 flex-1 rounded-md border font-mono text-xl first:rounded-md last:rounded-md bg-card dark:bg-card"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        {feedback}
        {pendingAction === "verify" && (
          <p role="status">{t.auth.checkingCode}</p>
        )}
        {resent && <p role="status">{t.auth.codeResent}</p>}
        <div className="flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            className={textLinkClassName}
            disabled={disabled}
            onClick={() => {
              void sendCode(true);
            }}
          >
            {pendingAction === "send" ? t.auth.sending : t.auth.sendNewCode}
          </button>
          <span className="text-muted-foreground">{t.auth.codeExpires}</span>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogTitle className="pr-8">{title}</DialogTitle>
      <DialogDescription className="sr-only">
        {t.auth.description}
      </DialogDescription>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={disabled}
        onClick={() => {
          void signInWithGoogle();
        }}
      >
        <img
          src="/google-g.svg"
          alt=""
          width={20}
          height={20}
          className="size-5 shrink-0"
        />
        {pendingAction === "google" ? t.auth.openingGoogle : t.auth.google}
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border/50" />
        {t.auth.or}
        <span className="h-px flex-1 bg-border/50" />
      </div>
      <form onSubmit={submitEmail} className="flex gap-2" aria-busy={pending}>
        <Input
          aria-label={t.auth.email}
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          disabled={disabled}
          className="h-11 min-w-0 flex-1 rounded-md"
        />
        <Button type="submit" disabled={disabled} className="h-11 px-4">
          {pending ? t.auth.sending : t.auth.sendCode}
        </Button>
      </form>
      {feedback}
    </>
  );
}
