import { createClerkClient } from "@clerk/backend";
import { createAuth } from "../auth";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization.trim());

  return match?.[1] ?? null;
}

export async function authenticateMcpRequest(
  ctx: ActionCtx,
  request: Request,
  verifyApiKey: (
    token: string,
    secretKey: string,
  ) => Promise<{ subject: string }> = verifyClerkApiKey,
) {
  const token = getBearerToken(request);

  if (!token) {
    return {
      authenticated: false as const,
      response: createAuthResponse(401, "A RiTodo MCP API key is required."),
    };
  }

  // Never send a RiTodo key to Clerk, including when it is invalid or revoked.
  if (token.startsWith("ritodo_")) {
    try {
      const result = await createAuth(ctx).api.verifyApiKey({
        body: { key: token },
      });
      const userId =
        result.valid && result.key
          ? await ctx.runQuery(internal.system.users.resolveMcpOwner, {
              betterAuthId: result.key.referenceId,
            })
          : null;
      if (userId) {
        return { authenticated: true as const, userId };
      }
    } catch {
      // Fail closed without exposing key details or falling back to another provider.
    }
    return {
      authenticated: false as const,
      response: createAuthResponse(
        401,
        "The RiTodo MCP API key is invalid or unavailable.",
      ),
    };
  }

  const secretKey = process.env.CLERK_SECRET_KEY?.trim();

  if (!secretKey) {
    return {
      authenticated: false as const,
      response: Response.json(
        { error: "RiTodo MCP authentication is unavailable." },
        { status: 500 },
      ),
    };
  }

  try {
    const apiKey = await verifyApiKey(token, secretKey);

    if (!apiKey.subject.startsWith("user_")) {
      return {
        authenticated: false as const,
        response: Response.json(
          { error: "Only user-scoped API keys can access RiTodo." },
          { status: 403 },
        ),
      };
    }

    return { authenticated: true as const, userId: apiKey.subject };
  } catch {
    return {
      authenticated: false as const,
      response: createAuthResponse(401, "The Clerk API key is invalid."),
    };
  }
}

async function verifyClerkApiKey(token: string, secretKey: string) {
  const clerkClient = createClerkClient({ secretKey });

  return clerkClient.apiKeys.verify(token);
}

function createAuthResponse(status: number, error: string) {
  return Response.json(
    { error },
    {
      status,
      headers: {
        "WWW-Authenticate": 'Bearer realm="RiTodo MCP"',
      },
    },
  );
}
