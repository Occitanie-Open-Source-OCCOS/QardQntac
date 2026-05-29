import { adminClient, inferAdditionalFields, magicLinkClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type authServer from "@/lib/auth/server";

const authClientConfig = {
	plugins: [adminClient(), twoFactorClient(), magicLinkClient(), inferAdditionalFields<typeof authServer>()],
} satisfies Parameters<typeof createAuthClient>[0];

export default authClientConfig;
