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
		VISION_PROVIDER: z.enum(["ollama", "openai", "anthropic", "gemini"]).default("ollama"),
		OPENAI_API_KEY: z.string().optional(),
		OPENAI_MODEL: z.string().default("gpt-4o"),
		ANTHROPIC_API_KEY: z.string().optional(),
		ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-20241022"),
		GEMINI_API_KEY: z.string().optional(),
		GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
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
		VISION_PROVIDER: process.env.VISION_PROVIDER,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		OPENAI_MODEL: process.env.OPENAI_MODEL,
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
		ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
		GEMINI_API_KEY: process.env.GEMINI_API_KEY,
		GEMINI_MODEL: process.env.GEMINI_MODEL,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
