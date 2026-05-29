export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		if (!process.env.BETTER_AUTH_SECRET) {
			const crypto = await import("node:crypto");
			const generatedSecret = crypto.randomBytes(32).toString("hex");
			console.warn(
				"WARNING: BETTER_AUTH_SECRET is not set. A temporary secret has been generated for this session. Please set a persistent secret in your environment variables for production use.",
			);
			process.env.BETTER_AUTH_SECRET = generatedSecret;
		}
	}
}
