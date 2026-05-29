"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { contacts, userCarddavConfig } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { deleteContact as cardDavDeleteContact } from "@/lib/carddav";
import { db } from "@/lib/db";

export const deleteContact = anyAuthenticatedAction
	.schema(z.object({ id: z.number() }))
	.action(async ({ parsedInput: { id }, ctx: { userId } }) => {
		const [contact] = await db
			.select()
			.from(contacts)
			.where(and(eq(contacts.id, id), eq(contacts.userId, userId)));

		if (contact?.remoteId) {
			const [config] = await db.select().from(userCarddavConfig).where(eq(userCarddavConfig.userId, userId));

			if (config) {
				try {
					await cardDavDeleteContact(contact.remoteId, config.url, {
						url: config.url,
						username: config.username,
						password: config.password,
					});
				} catch (e) {
					console.error("Failed to delete from Radicale:", e);
					// We continue deleting locally even if remote deletion fails
				}
			}
		}

		await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
	});
