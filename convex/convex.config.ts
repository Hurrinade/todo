import legacyAuthData from "./betterAuth/convex.config";
import resend from "@convex-dev/resend/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";
import auth from "@convex-dev/auth/convex.config.js";
import authGoogle from "@convex-dev/auth/components/google/convex.config.js";
import authEmail from "@convex-dev/auth/components/email/convex.config.js";

const app = defineApp({
  env: {
    GOOGLE_CLIENT_ID: v.string(),
    GOOGLE_CLIENT_SECRET: v.string(),
    SITE_URL: v.string(),
    AUTH_EMAIL_FROM: v.string(),
    RESEND_API_KEY: v.string(),
  },
});
// Preserve existing provider bindings and key rows under their original mount.
app.use(legacyAuthData);
app.use(resend);
app.use(auth);
app.use(authEmail);
app.use(authGoogle, {
  httpPrefix: "/oauth/google",
  env: {
    CLIENT_ID: app.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: app.env.GOOGLE_CLIENT_SECRET,
  },
});

export default app;
