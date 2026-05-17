import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();
    const wh = new Webhook(webhookSecret);

    let payload;
    try {
      payload = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as {
        type: string;
        data: {
          id: string;
          email_addresses: Array<{
            id: string;
            email_address: string;
          }>;
          primary_email_address_id: string;
          first_name: string | null;
          last_name: string | null;
          image_url: string | null;
        };
      };
    } catch {
      return new Response("Invalid webhook signature", { status: 400 });
    }

    const eventType = payload.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } =
        payload.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === payload.data.primary_email_address_id,
      );

      if (!primaryEmail) {
        return new Response("No primary email found", { status: 400 });
      }

      await ctx.runMutation(internal.system.users.syncFromClerk, {
        clerkId: id,
        email: primaryEmail.email_address,
        firstName: first_name ?? undefined,
        lastName: last_name ?? undefined,
        imageUrl: image_url ?? undefined,
      });
    }

    return new Response("Webhook processed", { status: 200 });
  }),
});

export default http;
