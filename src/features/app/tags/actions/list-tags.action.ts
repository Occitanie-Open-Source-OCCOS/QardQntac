"use server";

import { eq } from "drizzle-orm";
import { tags } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const listTags = anyAuthenticatedAction.action(
  async ({ ctx: { userId } }) => {
    return db.select().from(tags).where(eq(tags.userId, userId));
  },
);
