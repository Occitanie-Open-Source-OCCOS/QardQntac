import { z } from "zod";

export const phoneSchema = z.object({
  number: z.string().trim().min(1, "Enter a phone number"),
  label: z.string().trim(),
});

export const contactSchema = z.object({
  name: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  title: z.string(),
  company: z.string(),
  email: z.string(),
  phones: z.array(phoneSchema),
  website: z.string(),
  address: z.string(),
});

export type ContactSchemaType = z.infer<typeof contactSchema>;
