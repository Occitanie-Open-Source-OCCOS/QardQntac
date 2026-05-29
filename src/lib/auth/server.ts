import { betterAuth } from "better-auth";
import authServerConfig from "@/config/auth/server";

export const authServer = betterAuth(authServerConfig);

export default authServer;
