import { env } from "@/env";

const isConfigured = !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM);

export const emailConfig = {
	isConfigured,
	transport: isConfigured
		? {
				host: env.SMTP_HOST!,
				port: env.SMTP_PORT!,
				// Implicit TLS only on 465; other ports (587, 1025…) upgrade via STARTTLS when offered.
				secure: env.SMTP_PORT === 465,
				auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
			}
		: null,
	defaults: {
		from: env.SMTP_FROM ?? "QardQntac <no-reply@localhost>",
	},
} as const;
