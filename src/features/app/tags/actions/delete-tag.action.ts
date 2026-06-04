"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { tags } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const deleteTag = anyAuthenticatedAction
	.inputSchema(z.object({ id: z.uuid() }))
	.action(async ({ parsedInput: { id }, ctx: { userId } }) => {
		await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));
	});
