"use server";

import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { contacts } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

const contactSchema = z.object({
  name: z.string(),
  title: z.string(),
  company: z.string(),
  email: z.string(),
  phone: z.string(),
  website: z.string(),
  address: z.string(),
});

export const saveContact = anyAuthenticatedAction
  .inputSchema(contactSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const conditions = [];
    if (parsedInput.email)
      conditions.push(eq(contacts.email, parsedInput.email));
    if (parsedInput.phone)
      conditions.push(eq(contacts.phone, parsedInput.phone));
    if (parsedInput.name) conditions.push(eq(contacts.name, parsedInput.name));

    if (conditions.length > 0) {
      const existing = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.userId, userId), or(...conditions)))
        .limit(1);

      if (existing.length > 0) {
        throw new Error("Un contact avec ces coordonnées existe déjà.");
      }
    }

    const [contact] = await db
      .insert(contacts)
      .values({ userId, ...parsedInput })
      .returning();

    return { id: contact.id };
  });
