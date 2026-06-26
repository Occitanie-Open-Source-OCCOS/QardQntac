import {
  inferAdditionalFields,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type authServer from "@/lib/auth/server";

const authClientConfig = {
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  plugins: [magicLinkClient(), inferAdditionalFields<typeof authServer>()],
} satisfies Parameters<typeof createAuthClient>[0];

export default authClientConfig;
