"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { tags } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const updateTag = anyAuthenticatedAction
  .inputSchema(
    z.object({
      id: z.uuid(),
      name: z.string().min(1).optional(),
      color: z.string().min(1).optional(),
    }),
  )
  .action(async ({ parsedInput: { id, name, color }, ctx: { userId } }) => {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    await db
      .update(tags)
      .set(updates)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)));
  });
