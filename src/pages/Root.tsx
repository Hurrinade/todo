import { Unauthenticated, useConvexAuth } from "convex/react";
import { SignInButton, SignUpButton } from "@clerk/react";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { Navigate } from "react-router";
import { Button } from "@/components/ui/button";

const landingHighlights = [
  "Organize boards with focused task lists.",
  "Capture todo notes without leaving the workspace.",
  "Share lists through simple invite links.",
];

export default function Root() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return (
    <main className="min-h-full w-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 py-6 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between gap-4">
          <span className="font-semibold text-xl">RiTodo</span>
          <Unauthenticated>
            <SignInButton mode="modal">
              <button className="text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none">
                Sign in
              </button>
            </SignInButton>
          </Unauthenticated>
        </nav>

        <section className="flex flex-col gap-8 pt-8 sm:pt-14">
          <div className="max-w-2xl space-y-5">
            <p className="text-sm font-medium text-primary">Personal lists</p>
            <div className="space-y-4">
              <h1 className="max-w-xl text-3xl leading-tight font-semibold text-balance sm:text-4xl">
                A quiet workspace for the things you need to finish.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                RiTodo keeps boards, todos, notes, and shared lists in one clean
                place so everyday planning stays direct and readable.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Unauthenticated>
                <>
                  <SignUpButton mode="modal">
                    <Button size="lg">
                      <UserPlus />
                      Create account
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <Button variant="outline" size="lg">
                      <LogIn />
                      Sign in
                    </Button>
                  </SignInButton>
                </>
              </Unauthenticated>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-border/70 bg-card/35">
            <img
              src="/ritodo.webp"
              alt="RiTodo workspace showing todo boards and a grocery list"
              className="block h-auto w-full"
            />
          </div>
        </section>

        <section className="grid gap-5 border-t border-border/70 pt-8 text-sm text-muted-foreground sm:grid-cols-3">
          {landingHighlights.map((highlight) => (
            <p key={highlight} className="leading-6">
              {highlight}
            </p>
          ))}
        </section>
      </div>
    </main>
  );
}
