"use server";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { contactTags, contacts, tags } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const assignTags = anyAuthenticatedAction
	.inputSchema(z.object({ contactId: z.number(), tagIds: z.array(z.uuid()) }))
	.action(async ({ parsedInput: { contactId, tagIds }, ctx: { userId } }) => {
		const [contact] = await db
			.select({ id: contacts.id })
			.from(contacts)
			.where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
			.limit(1);
		if (!contact) throw new Error("Contact introuvable");

		if (tagIds.length > 0) {
			const userTags = await db
				.select({ id: tags.id })
				.from(tags)
				.where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)));
			if (userTags.length !== tagIds.length) throw new Error("Tag invalide");
		}

		await db.delete(contactTags).where(eq(contactTags.contactId, contactId));
		if (tagIds.length > 0) {
			await db.insert(contactTags).values(tagIds.map((tagId) => ({ contactId, tagId })));
		}
	});
