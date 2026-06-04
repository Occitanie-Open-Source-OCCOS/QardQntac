"use server";

import { z } from "zod";
import { tags } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const createTag = anyAuthenticatedAction
	.inputSchema(z.object({ name: z.string().min(1), color: z.string().min(1) }))
	.action(async ({ parsedInput: { name, color }, ctx: { userId } }) => {
		const [tag] = await db
			.insert(tags)
			.values({ userId, name, color })
			.returning();
		return tag;
	});
