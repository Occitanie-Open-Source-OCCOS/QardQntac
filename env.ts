import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		APP_URL: z.url(),
		BETTER_AUTH_SECRET: z.string().min(1),
		DATABASE_URL: z.string().min(1),
		AUTORIZED_DOMAINS: z
			.string()
			.default("")
			.transform((str) =>
				str
					.split(",")
					.map((s) => s.trim())
					.filter((s) => s.length > 0),
			),
		SMTP_HOST: z.string(),
		SMTP_PORT: z.coerce.number(),
		SMTP_USER: z.string(),
		SMTP_PASSWORD: z.string(),
		SMTP_FROM: z.string(),
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		APP_LOCALE: z.enum(["fr", "en"]).default("fr"),
		OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
		OLLAMA_MODEL: z.string().default("llama3.2-vision"),
	},

	client: {
		NEXT_PUBLIC_APP_NAME: z.string().nonempty(),
		NEXT_PUBLIC_APP_URL: z.string().nonempty(),
	},

	runtimeEnv: {
		APP_URL: process.env.APP_URL,
		DATABASE_URL: process.env.DATABASE_URL,
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		AUTORIZED_DOMAINS: process.env.AUTORIZED_DOMAINS,

		NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,

		SMTP_HOST: process.env.SMTP_HOST,
		SMTP_PORT: process.env.SMTP_PORT,
		SMTP_USER: process.env.SMTP_USER,
		SMTP_PASSWORD: process.env.SMTP_PASSWORD,
		SMTP_FROM: process.env.SMTP_FROM,

		NODE_ENV: process.env.NODE_ENV,

		APP_LOCALE: process.env.APP_LOCALE,
		OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
		OLLAMA_MODEL: process.env.OLLAMA_MODEL,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
