"use server";

import { desc, eq } from "drizzle-orm";
import { contacts } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const listContacts = anyAuthenticatedAction.action(async ({ ctx: { userId } }) => {
	return db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.createdAt));
});
