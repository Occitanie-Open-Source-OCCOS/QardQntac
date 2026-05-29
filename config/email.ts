import { env } from "@/env";

export const emailConfig = {
	transport: {
		host: env.SMTP_HOST,
		port: env.SMTP_PORT,
		secure: env.NODE_ENV === "production",
		auth: {
			user: env.SMTP_USER,
			pass: env.SMTP_PASSWORD,
		},
	},
	defaults: {
		from: env.SMTP_FROM,
	},
} as const;
