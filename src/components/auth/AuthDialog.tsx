import { useState, type FormEvent, type ReactElement } from "react";
import { useSendEmailMagicLink } from "@convex-dev/auth/methods/email-magic-link/react";
import {
  useOauth,
  useSignInWithGoogle,
} from "@convex-dev/auth/methods/google/react";
import { ConvexError } from "convex/values";

import { api } from "@convex/_generated/api";
import { USE_EMAIL_LINK } from "@convex/shared/googleSignIn";
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
import { saveEmailSignInReturn } from "@/lib/auth-return";
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
      googleError.cause.data === USE_EMAIL_LINK
      ? t.auth.useEmailLink
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
}: {
  title: string;
  googleMessage: string | null;
}) {
  const [email, setEmail] = useState(getLastUsedEmail);
  const [linkSent, setLinkSent] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(googleMessage);
  const [openingGoogle, setOpeningGoogle] = useState(false);
  const { sendMagicLink, pending } = useSendEmailMagicLink(api.nativeAuth);
  const { signIn } = useSignInWithGoogle(api.nativeAuth);
  const isOnline = useNetworkStore((state) => state.isOnline);
  const t = useT();
  const disabled = pending || openingGoogle || !isOnline;

  async function sendLink(resend: boolean) {
    if (disabled) {
      return;
    }
    setError(null);
    setResent(false);
    const result = await sendMagicLink({ email: email.trim() });
    if (!result.success) {
      setError(t.auth.linkNotSent);
      return;
    }
    saveEmailSignInReturn();
    setLinkSent(true);
    setResent(resend);
  }

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendLink(false);
  }

  async function signInWithGoogle() {
    if (disabled) {
      return;
    }
    setOpeningGoogle(true);
    setError(null);
    try {
      const result = await signIn();
      if (result.status === "error") {
        setError(t.auth.googleNotStarted);
        setOpeningGoogle(false);
      }
    } catch {
      setError(t.auth.googleNotStarted);
      setOpeningGoogle(false);
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

  if (linkSent) {
    return (
      <>
        <DialogTitle className="pr-8">{t.auth.checkEmail}</DialogTitle>
        <DialogDescription className="break-words text-foreground">
          {t.auth.linkSentTo(email.trim())}
        </DialogDescription>
        <p className="text-muted-foreground">{t.auth.openLinkHere}</p>
        {feedback}
        {resent && <p role="status">{t.auth.linkResent}</p>}
        <div className="flex flex-wrap items-center gap-x-4">
          <button
            type="button"
            className={textLinkClassName}
            disabled={disabled}
            onClick={() => void sendLink(true)}
          >
            {pending ? t.auth.sending : t.auth.sendNewLink}
          </button>
          <button
            type="button"
            className={textLinkClassName}
            disabled={pending}
            onClick={() => {
              setLinkSent(false);
              setError(null);
              setResent(false);
            }}
          >
            {t.auth.changeEmail}
          </button>
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
        {openingGoogle ? t.auth.openingGoogle : t.auth.google}
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
          {pending ? t.auth.sending : t.auth.sendLink}
        </Button>
      </form>
      {feedback}
    </>
  );
}
