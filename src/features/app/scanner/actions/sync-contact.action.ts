"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { contacts, userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { getProvider } from "@/lib/carddav";
import { db } from "@/lib/db";
import { generateVCard } from "@/lib/vcf";

export const syncContact = anyAuthenticatedAction
	.inputSchema(z.object({ id: z.number(), providerId: z.uuid() }))
	.action(async ({ parsedInput: { id, providerId }, ctx: { userId } }) => {
		const [config] = await db
			.select()
			.from(userCardDavProviders)
			.where(and(eq(userCardDavProviders.id, providerId), eq(userCardDavProviders.userId, userId)));
		if (!config) throw new Error("Provider introuvable");

		const [contact] = await db
			.select()
			.from(contacts)
			.where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
		if (!contact) throw new Error("Contact introuvable");

		const vcard = generateVCard(contact);
		const provider = getProvider(config.type);
		const remoteId = await provider.saveContact(
			vcard,
			config.url,
			{ url: config.url, username: config.username, password: config.password },
			contact.remoteId || undefined,
		);

		await db.update(contacts).set({ syncedAt: new Date(), remoteId, providerId }).where(eq(contacts.id, id));
	});
