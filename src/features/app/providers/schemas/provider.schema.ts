import { z } from "zod";

export const providerSchema = z.object({
	id: z.uuid().optional(),
	type: z.enum(["radicale", "baikal", "nextcloud", "custom"]),
	label: z.string().min(1),
	url: z.string().min(1),
	username: z.string().min(1),
	password: z.string().optional(),
});

export type ProviderSchemaType = z.infer<typeof providerSchema>;
