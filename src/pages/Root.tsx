import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, SignUpButton } from "@clerk/react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function Root() {
  return (
    <main className="flex h-full w-full items-center justify-center overflow-y-auto p-6">
      <div className="flex max-w-2xl flex-col gap-6 rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-sm">
        <div className="space-y-3">
          <span className="inline-flex w-fit rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            React Vite Template
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">
            Root page example for future projects
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            The root route is the only page that lives directly in
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
              src/pages
            </code>
            without an authenticated or unauthenticated folder. Use it for the
            public entry page that should always exist at
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
              /
            </code>
            .
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Authenticated>
            <>
              <Button asChild>
                <Link to="/home">Open authenticated home</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/public">Open public route example</Link>
              </Button>
            </>
          </Authenticated>

          <Unauthenticated>
            <>
              <SignInButton mode="modal">
                <Button>Sign in</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="outline">Create account</Button>
              </SignUpButton>
              <Button variant="ghost" asChild>
                <Link to="/public">Open public route example</Link>
              </Button>
            </>
          </Unauthenticated>
        </div>
      </div>
    </main>
  );
}
