import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { httpAction } from "../_generated/server";
import { authenticateMcpRequest } from "./auth";
import { createRiTodoMcpServer } from "./server";

export const handleMcpRequest = httpAction(async (ctx, request) => {
  const authentication = await authenticateMcpRequest(request);

  if (!authentication.authenticated) {
    return authentication.response;
  }

  const server = createRiTodoMcpServer(ctx, authentication.userId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  return transport.handleRequest(request);
});
