"use server";

import { z } from "zod";
import { anyAuthenticatedAction } from "@/lib/actions";
import { getProvider } from "@/lib/carddav";

export const testProviderConnection = anyAuthenticatedAction
	.inputSchema(
		z.object({
			type: z.enum(["radicale", "baikal", "nextcloud", "custom"]),
			url: z.string().min(1),
			username: z.string().min(1),
			password: z.string().min(1),
		}),
	)
	.action(async ({ parsedInput: { type, url, username, password } }) => {
		const provider = getProvider(type);
		await provider.testConnection({ url, username, password });
	});
