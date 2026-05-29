import { z } from "zod";
import { WHITELISTED_DOMAINS } from "@/config/restrictions";

export const authSchema = z.object({
	email: z.email("Adresse mail invalide").refine(
		(email) => {
			const domain = email.split("@")[1];
			return WHITELISTED_DOMAINS.includes(domain?.toLowerCase());
		},
		{ message: "Adresse mail non autorisée." },
	),
});

export type AuthSchemaType = z.infer<typeof authSchema>;
