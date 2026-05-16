import { SignInButton, SignUpButton } from "@clerk/react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function Public() {
  return (
    <main className="flex h-full w-full items-center justify-center overflow-y-auto p-6">
      <div className="flex max-w-2xl flex-col gap-6 rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-sm">
        <div className="space-y-3">
          <span className="inline-flex w-fit rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Public Route Example
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">
            Simple unauthenticated page for future projects
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Routes inside
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
              src/pages/unauthenticated
            </code>
            can be used for public, signed-out, or auth-friendly pages that do
            not require a session.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <SignInButton mode="modal">
            <Button>Sign in</Button>
          </SignInButton>

          <SignUpButton mode="modal">
            <Button variant="outline">Create account</Button>
          </SignUpButton>

          <Button variant="ghost" asChild>
            <Link to="/">Back to root</Link>
          </Button>

          <Button variant="ghost" asChild>
            <Link to="/home">See protected example</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
