import { useSignInWithEmailMagicLink } from "@convex-dev/auth/methods/email-magic-link/react";
import { useConvexAuth } from "convex/react";
import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useT } from "@/hooks";
import {
  clearEmailSignInReturn,
  readEmailSignInReturn,
} from "@/lib/auth-return";

export default function EmailSignIn() {
  const [params] = useSearchParams();
  const code = params.get("code");
  const [returnTo] = useState(readEmailSignInReturn);
  return code ? (
    <CompleteSignIn key={code} code={code} returnTo={returnTo} />
  ) : (
    <LinkError returnTo={returnTo} />
  );
}

function CompleteSignIn({
  code,
  returnTo,
}: {
  code: string;
  returnTo: string;
}) {
  const state = useSignInWithEmailMagicLink(api.nativeAuth, {
    emailCode: code,
  });
  const { isAuthenticated } = useConvexAuth();
  const t = useT();

  useEffect(() => {
    if (state.status === "complete") {
      clearEmailSignInReturn();
    }
  }, [state.status]);

  if (state.status === "error") {
    return (
      <LinkError
        returnTo={returnTo}
        missingBrowser={state.userError.error === "MISSING_SECRET"}
      />
    );
  }
  if (state.status === "complete" && isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }
  return (
    <div
      role="status"
      className="flex min-h-full items-center justify-center gap-3 p-6"
    >
      <Spinner />
      {t.auth.checkingLink}
    </div>
  );
}

function LinkError({
  returnTo,
  missingBrowser = false,
}: {
  returnTo: string;
  missingBrowser?: boolean;
}) {
  const t = useT();
  return (
    <section className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 px-6 py-8">
      <h1 className="text-xl font-semibold">
        {missingBrowser ? t.auth.originalBrowserTitle : t.auth.linkInvalid}
      </h1>
      {missingBrowser && <p>{t.auth.originalBrowserMessage}</p>}
      <Button asChild className="h-11">
        <Link to={returnTo} replace>
          {t.auth.requestNewLink}
        </Link>
      </Button>
    </section>
  );
}
