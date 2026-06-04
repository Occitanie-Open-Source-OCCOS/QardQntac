"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { contacts, userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { getProvider } from "@/lib/carddav";
import { db } from "@/lib/db";

export const deleteContact = anyAuthenticatedAction
	.inputSchema(z.object({ id: z.number() }))
	.action(async ({ parsedInput: { id }, ctx: { userId } }) => {
		const [contact] = await db
			.select()
			.from(contacts)
			.where(and(eq(contacts.id, id), eq(contacts.userId, userId)));

		if (contact?.remoteId && contact.providerId) {
			const [config] = await db
				.select()
				.from(userCardDavProviders)
				.where(eq(userCardDavProviders.id, contact.providerId));

			if (config) {
				try {
					const provider = getProvider(config.type);
					await provider.deleteContact(contact.remoteId, config.url, {
						url: config.url,
						username: config.username,
						password: config.password,
					});
				} catch (e) {
					console.error("Failed to delete from remote:", e);
				}
			}
		}

		await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
	});
