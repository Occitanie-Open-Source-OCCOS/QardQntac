"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { contacts, userCarddavConfig } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { saveContact as cardDavSaveContact } from "@/lib/carddav";
import { db } from "@/lib/db";
import { generateVCard } from "@/lib/vcf";

export const syncContact = anyAuthenticatedAction
	.schema(z.object({ id: z.number() }))
	.action(async ({ parsedInput: { id }, ctx: { userId } }) => {
		const [config] = await db.select().from(userCarddavConfig).where(eq(userCarddavConfig.userId, userId));
		if (!config) throw new Error("CardDAV non configuré");

		const [contact] = await db
			.select()
			.from(contacts)
			.where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
		if (!contact) throw new Error("Contact introuvable");

		const vcard = generateVCard(contact);
		const remoteId = await cardDavSaveContact(
			vcard,
			config.url,
			{
				url: config.url,
				username: config.username,
				password: config.password,
			},
			contact.remoteId || undefined,
		);

		await db.update(contacts).set({ syncedAt: new Date(), remoteId }).where(eq(contacts.id, id));
	});
