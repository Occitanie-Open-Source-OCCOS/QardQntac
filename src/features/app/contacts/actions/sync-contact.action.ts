"use server";

import { and, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { contacts, contactTags, tags, userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { getProvider } from "@/lib/carddav";
import { db } from "@/lib/db";
import { generateVCard } from "@/lib/vcf";

export const syncContact = anyAuthenticatedAction
	.inputSchema(z.object({ id: z.number(), providerId: z.uuid() }))
	.action(async ({ parsedInput: { id, providerId }, ctx: { userId } }) => {
		const t = await getTranslations("contacts.errors");
		const [config] = await db
			.select()
			.from(userCardDavProviders)
			.where(and(eq(userCardDavProviders.id, providerId), eq(userCardDavProviders.userId, userId)));
		if (!config) throw new Error(t("missing_provider"));

		const [contact] = await db
			.select()
			.from(contacts)
			.where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
		if (!contact) throw new Error(t("contact_not_found"));

		const ctRows = await db.select({ tagId: contactTags.tagId }).from(contactTags).where(eq(contactTags.contactId, id));
		let tagNames: string[] = [];
		if (ctRows.length > 0) {
			const tagRows = await db
				.select({ name: tags.name })
				.from(tags)
				.where(
					inArray(
						tags.id,
						ctRows.map((r) => r.tagId),
					),
				);
			tagNames = tagRows.map((r) => r.name);
		}

		const vcard = generateVCard(contact, tagNames);
		const provider = getProvider(config.type);
		const remoteId = await provider.saveContact(
			vcard,
			config.url,
			{ url: config.url, username: config.username, password: config.password },
			contact.remoteId || undefined,
		);

		await db.update(contacts).set({ syncedAt: new Date(), remoteId, providerId }).where(eq(contacts.id, id));
	});
