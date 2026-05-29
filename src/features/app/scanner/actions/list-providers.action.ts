"use server";

import { eq } from "drizzle-orm";
import { userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const listProviders = anyAuthenticatedAction.action(async ({ ctx: { userId } }) => {
	return db
		.select({
			id: userCardDavProviders.id,
			userId: userCardDavProviders.userId,
			type: userCardDavProviders.type,
			label: userCardDavProviders.label,
			url: userCardDavProviders.url,
			username: userCardDavProviders.username,
			createdAt: userCardDavProviders.createdAt,
			updatedAt: userCardDavProviders.updatedAt,
		})
		.from(userCardDavProviders)
		.where(eq(userCardDavProviders.userId, userId));
});
