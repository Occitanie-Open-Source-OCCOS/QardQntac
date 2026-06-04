import { env } from "@/env";

const isConfigured = !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM);

export const emailConfig = {
	isConfigured,
	transport: isConfigured
		? {
				host: env.SMTP_HOST!,
				port: env.SMTP_PORT!,
				secure: env.NODE_ENV === "production",
				auth: env.SMTP_USER
					? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
					: undefined,
			}
		: null,
	defaults: {
		from: env.SMTP_FROM ?? "KardQntact <no-reply@localhost>",
	},
} as const;
