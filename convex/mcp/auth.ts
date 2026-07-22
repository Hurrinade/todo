import { createClerkClient } from "@clerk/backend";

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization.trim());

  return match?.[1] ?? null;
}

export async function authenticateMcpRequest(
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
      response: createAuthResponse(401, "A Clerk API key is required."),
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
