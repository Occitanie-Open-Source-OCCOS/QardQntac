import { z } from "zod";

export const authSchema = z.object({
  email: z.email("Invalid email address"),
});

export type AuthSchemaType = z.infer<typeof authSchema>;
