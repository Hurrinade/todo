import { Unauthenticated, useConvexAuth } from "convex/react";
import AuthDialog from "@/components/auth/AuthDialog";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { Navigate } from "react-router";
import { Button } from "@/components/ui/button";
import { legalConfig } from "@/config/legal";
import { useT } from "@/hooks";
import { useNetworkStore } from "@/stores";

export default function Root() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const t = useT();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return (
    <main className="min-h-full w-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between gap-4">
          <span className="font-semibold text-xl">RiTodo</span>
          <Unauthenticated>
            <AuthDialog openOnGoogleError>
              <button
                className="-mr-2 inline-flex min-h-11 items-center px-2 text-muted-foreground transition-colors pointer-fine:min-h-6 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isOnline}
              >
                {t.auth.signIn}
              </button>
            </AuthDialog>
          </Unauthenticated>
        </nav>

        <section className="flex flex-col gap-8 pt-8 sm:pt-14">
          <div className="max-w-2xl space-y-5">
            <p className="text-sm font-medium text-primary">
              {t.landing.eyebrow}
            </p>
            <div className="space-y-4">
              <h1 className="max-w-xl text-3xl leading-tight font-semibold text-balance sm:text-4xl">
                {t.landing.title}
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                {t.landing.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Unauthenticated>
                <>
                  <AuthDialog initialMode="sign-up">
                    <Button size="mobile-lg" disabled={!isOnline}>
                      <UserPlus />
                      {t.auth.createAccount}
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                  </AuthDialog>
                  <AuthDialog>
                    <Button
                      variant="outline"
                      size="mobile-lg"
                      disabled={!isOnline}
                    >
                      <LogIn />
                      {t.auth.signIn}
                    </Button>
                  </AuthDialog>
                </>
              </Unauthenticated>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-border/70 bg-card/35">
            <img
              src="/ritodo.webp"
              alt={t.landing.imageAlt}
              className="block h-auto w-full"
            />
          </div>
        </section>

        <section className="grid gap-5 border-t border-border/70 pt-8 text-sm text-muted-foreground sm:grid-cols-3">
          {t.landing.highlights.map((highlight) => (
            <p key={highlight} className="leading-6">
              {highlight}
            </p>
          ))}
        </section>

        <footer className="border-t border-border/70 pt-6 text-sm text-muted-foreground">
          <p>
            {legalConfig.appName} &mdash; {t.landing.builtBy}{" "}
            <a
              className="transition-colors hover:text-foreground"
              href={legalConfig.companyWebsite}
            >
              {legalConfig.companyName}
            </a>
            , Zagreb
          </p>
        </footer>
      </div>
    </main>
  );
}
