"use server";

import { z } from "zod";
import { userCarddavConfig } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const saveCarddavConfig = anyAuthenticatedAction
	.schema(
		z.object({
			url: z.string().min(1),
			username: z.string().min(1),
			password: z.string().min(1),
		}),
	)
	.action(async ({ parsedInput, ctx: { userId } }) => {
		await db
			.insert(userCarddavConfig)
			.values({ userId, ...parsedInput })
			.onConflictDoUpdate({
				target: userCarddavConfig.userId,
				set: { ...parsedInput, updatedAt: new Date() },
			});
	});
