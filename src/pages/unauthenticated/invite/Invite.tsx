import { SignInButton } from "@clerk/react";
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
import { useNetworkStore } from "@/stores";
import { OFFLINE_ACTION_MESSAGE } from "@/utils";

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
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);
  const invite = useMemo(() => inviteResult ?? null, [inviteResult]);
  const isExpired = invite ? invite.expiresAt <= dayjs().valueOf() : false;

  const handleAcceptInvite = async () => {
    if (!params.token) {
      return;
    }

    if (!isOnline) {
      setErrorMessage(OFFLINE_ACTION_MESSAGE);
      return;
    }

    setIsAcceptingInvite(true);
    setErrorMessage(null);

    try {
      const result = await acceptInvite({ token: params.token });
      navigate("/home", {
        replace: true,
        state: {
          selectedListId: result.listId,
        },
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsAcceptingInvite(false);
    }
  };

  const handleCancel = () => {
    navigate(isAuthenticated ? "/home" : "/", { replace: true });
  };

  if (!params.token) {
    return (
      <main className="flex h-full items-center justify-center p-6">
        <div className="rounded-3xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
          Invite link is not valid.
        </div>
      </main>
    );
  }

  if (inviteResult === undefined) {
    return (
      <main className="flex h-full items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
          <Spinner />
          Loading invite
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
              Shared list invite
            </div>

            <div className="mt-6 space-y-4">
              <h1 className="max-w-md text-3xl font-semibold tracking-tight text-foreground">
                {invite ? invite.listTitle : "Invite link unavailable"}
              </h1>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                Join this shared todo list.
              </p>
            </div>

            <div className="mt-8 grid gap-3">
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="flex items-center gap-3">
                  <Users className="size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Shared access
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Members can manage the list and all todos together.
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
                  Join decision
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  {invite && !isExpired
                    ? "Open this list in your workspace"
                    : "This invite cannot be used"}
                </h2>
              </div>

              {!invite ? (
                <StatusCard
                  title="Invite link is not valid."
                  description="It may have been replaced by a newer invite or already removed."
                  tone="warning"
                />
              ) : isExpired ? (
                <StatusCard
                  title="Invite link has expired."
                  description="Ask a current list member to generate a new invite link."
                  tone="warning"
                />
              ) : invite.isCurrentUserMember ? (
                <StatusCard
                  title="You already have access."
                  description="You can open the shared list directly in your workspace."
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
                  Checking your session
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
                          navigate("/home", {
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
                        ? "Open shared list"
                        : isAcceptingInvite
                          ? "Joining..."
                          : "Join list"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <SignInButton mode="modal">
                      <Button
                        type="button"
                        className="h-11 w-full"
                        disabled={!isOnline}
                      >
                        Sign in to join
                      </Button>
                    </SignInButton>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full"
                      onClick={handleCancel}
                    >
                      Cancel
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
                    Go back
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
