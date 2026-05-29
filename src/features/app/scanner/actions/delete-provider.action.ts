"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { contacts, userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const deleteProvider = anyAuthenticatedAction
	.schema(z.object({ id: z.string().uuid() }))
	.action(async ({ parsedInput: { id }, ctx: { userId } }) => {
		await db
			.update(contacts)
			.set({ providerId: null })
			.where(and(eq(contacts.userId, userId), eq(contacts.providerId, id)));
		await db
			.delete(userCardDavProviders)
			.where(and(eq(userCardDavProviders.id, id), eq(userCardDavProviders.userId, userId)));
	});
