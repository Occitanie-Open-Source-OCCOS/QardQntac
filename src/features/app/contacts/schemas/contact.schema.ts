import { z } from "zod";

export const contactSchema = z.object({
	name: z.string(),
	title: z.string(),
	company: z.string(),
	email: z.string(),
	phone: z.string(),
	website: z.string(),
	address: z.string(),
});

export type ContactSchemaType = z.infer<typeof contactSchema>;
