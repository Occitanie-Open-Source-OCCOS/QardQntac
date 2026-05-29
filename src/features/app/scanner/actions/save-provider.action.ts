"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const saveProvider = anyAuthenticatedAction
	.schema(
		z.object({
			id: z.string().uuid().optional(),
			type: z.enum(["radicale", "baikal", "custom"]),
			label: z.string().min(1),
			url: z.string().min(1),
			username: z.string().min(1),
			password: z.string().optional(),
		}),
	)
	.action(async ({ parsedInput: { id, type, label, url, username, password }, ctx: { userId } }) => {
		if (id) {
			const updates: Record<string, unknown> = { type, label, url, username, updatedAt: new Date() };
			if (password) updates.password = password;
			await db
				.update(userCardDavProviders)
				.set(updates)
				.where(and(eq(userCardDavProviders.id, id), eq(userCardDavProviders.userId, userId)));
			return { id };
		}
		if (!password) throw new Error("Password required for new provider");
		const [row] = await db
			.insert(userCardDavProviders)
			.values({ userId, type, label, url, username, password })
			.returning({ id: userCardDavProviders.id });
		return { id: row.id };
	});
