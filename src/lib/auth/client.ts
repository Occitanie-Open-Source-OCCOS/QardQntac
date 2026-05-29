import { createAuthClient } from "better-auth/react";
import authClientConfig from "@/config/auth/client";

export const authClient = createAuthClient(authClientConfig);

export default authClient;
