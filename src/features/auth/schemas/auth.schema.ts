import { z } from "zod";

export const authSchema = z.object({
	email: z.email("Adresse mail invalide"),
});

export type AuthSchemaType = z.infer<typeof authSchema>;
