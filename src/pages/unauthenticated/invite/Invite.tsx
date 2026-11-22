import AuthDialog from "@/components/auth/AuthDialog";
import { api } from "@convex/_generated/api";
import {
  AuthLoading,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import dayjs from "dayjs";
import { CheckCircle2, Link2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useT } from "@/hooks";
import { translateAppError } from "@/i18n";
import { useNetworkStore } from "@/stores";

export default function Invite() {
  const navigate = useNavigate();
  const params = useParams<{ token: string }>();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const acceptInvite = useMutation(api.mutations.todoInvites.accept);
  const inviteResult = useQuery(
    api.queries.todoInvites.getByToken,
    params.token ? { token: params.token } : "skip",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const t = useT();
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);
  const invite = useMemo(() => inviteResult ?? null, [inviteResult]);
  const isExpired = invite ? invite.expiresAt <= dayjs().valueOf() : false;

  const handleAcceptInvite = async () => {
    if (!params.token) {
      return;
    }

    if (!isOnline) {
      setErrorMessage(t.common.offlineAction);
      return;
    }

    setIsAcceptingInvite(true);
    setErrorMessage(null);

    try {
      const result = await acceptInvite({ token: params.token });
      void navigate("/home", {
        replace: true,
        state: {
          selectedListId: result.listId,
        },
      });
    } catch (error) {
      setErrorMessage(
        translateAppError(error, t) ?? t.common.somethingWentWrongRetry,
      );
    } finally {
      setIsAcceptingInvite(false);
    }
  };

  const handleCancel = () => {
    void navigate(isAuthenticated ? "/home" : "/", { replace: true });
  };

  if (!params.token) {
    return (
      <main className="flex h-full items-center justify-center p-6">
        <div className="rounded-3xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
          {t.errors.inviteInvalid}
        </div>
      </main>
    );
  }

  if (inviteResult === undefined) {
    return (
      <main className="flex h-full items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
          <Spinner />
          {t.invite.loading}
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden px-6 pt-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-40 w-[min(42rem,92vw)] rounded-full bg-primary/10 blur-3xl" />

      <section className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-border/80 bg-card/95 shadow-[0_24px_80px_rgba(31,26,23,0.12)]">
        <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-border/70 bg-[linear-gradient(145deg,rgba(31,92,91,0.12),rgba(200,137,47,0.12))] p-8 md:border-r md:border-b-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background/80 px-3 py-1 text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              <Link2 className="size-3.5" />
              {t.invite.eyebrow}
            </div>

            <div className="mt-6 space-y-4">
              <h1 className="max-w-md text-3xl font-semibold tracking-tight text-foreground">
                {invite ? invite.listTitle : t.invite.unavailable}
              </h1>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                {t.invite.description}
              </p>
            </div>

            <div className="mt-8 grid gap-3">
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="flex items-center gap-3">
                  <Users className="size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t.invite.sharedAccess}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t.invite.sharedAccessDescription}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between bg-card p-8">
            <div className="space-y-4">
              <div>
                <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  {t.invite.decision}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  {invite && !isExpired
                    ? t.invite.openTitle
                    : t.invite.unusableTitle}
                </h2>
              </div>

              {!invite ? (
                <StatusCard
                  title={t.errors.inviteInvalid}
                  description={t.invite.invalidDescription}
                  tone="warning"
                />
              ) : isExpired ? (
                <StatusCard
                  title={t.errors.inviteExpired}
                  description={t.invite.expiredDescription}
                  tone="warning"
                />
              ) : invite.isCurrentUserMember ? (
                <StatusCard
                  title={t.invite.memberTitle}
                  description={t.invite.memberDescription}
                  tone="success"
                />
              ) : null}

              {errorMessage ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              ) : null}
            </div>

            <div className="mt-8 space-y-3">
              <AuthLoading>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground">
                  <Spinner />
                  {t.invite.checkingSession}
                </div>
              </AuthLoading>

              {!isLoading && invite && !isExpired ? (
                isAuthenticated ? (
                  <>
                    <Button
                      type="button"
                      className="h-11 w-full"
                      disabled={!isOnline || isAcceptingInvite}
                      onClick={() => {
                        if (invite.isCurrentUserMember) {
                          void navigate("/home", {
                            replace: true,
                            state: {
                              selectedListId: invite.listId,
                            },
                          });
                          return;
                        }

                        void handleAcceptInvite();
                      }}
                    >
                      <CheckCircle2 data-icon="inline-start" />
                      {invite.isCurrentUserMember
                        ? t.invite.open
                        : isAcceptingInvite
                          ? t.invite.joining
                          : t.invite.join}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full"
                      onClick={handleCancel}
                    >
                      {t.common.cancel}
                    </Button>
                  </>
                ) : (
                  <>
                    <AuthDialog openOnGoogleError>
                      <Button
                        type="button"
                        className="h-11 w-full"
                        disabled={!isOnline}
                      >
                        {t.invite.signInToJoin}
                      </Button>
                    </AuthDialog>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full"
                      onClick={handleCancel}
                    >
                      {t.common.cancel}
                    </Button>
                  </>
                )
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  asChild
                >
                  <Link to={isAuthenticated ? "/home" : "/"} replace>
                    {t.invite.goBack}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusCard({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: "success" | "warning";
}) {
  const toneClassName =
    tone === "success"
      ? "border-success/25 bg-success-soft text-foreground"
      : "border-warning/25 bg-warning-soft text-foreground";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClassName}`}>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}
