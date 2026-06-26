"use server";

import { eq } from "drizzle-orm";
import { contacts, contactTags } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const listContactTags = anyAuthenticatedAction.action(
  async ({ ctx: { userId } }) => {
    return db
      .select({ contactId: contactTags.contactId, tagId: contactTags.tagId })
      .from(contactTags)
      .innerJoin(contacts, eq(contacts.id, contactTags.contactId))
      .where(eq(contacts.userId, userId));
  },
);
