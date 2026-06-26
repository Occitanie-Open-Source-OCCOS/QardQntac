export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    if (!process.env.APP_SECRET) {
      const crypto = await import("node:crypto");
      const generatedSecret = crypto.randomBytes(32).toString("hex");
      console.warn(
        "WARNING: APP_SECRET is not set. A temporary secret has been generated for this session. Please set a persistent secret in your environment variables for production use.",
      );
      process.env.APP_SECRET = generatedSecret;
    }
    if (
      !process.env.DATABASE_URL &&
      process.env.DISABLE_DB_WARN !== "true" &&
      process.env.DISABLE_DB_WARN !== "1"
    ) {
      console.warn(
        "WARNING: DATABASE_URL is not set. Falling back to embedded database (./data/local.db).",
        "\nData persists between restarts but is NOT suitable for production.",
        "\nTo disable this warning, set DISABLE_DB_WARN=true in your .env\n",
      );
    }
    const { runMigrations } = await import("@/utils/migration");
    await runMigrations();
    const { checkVisionProvider } = await import("@/lib/vision/check");
    try {
      await checkVisionProvider();
    } catch (error) {
      console.warn(
        "WARNING: vision provider check failed at startup —",
        error instanceof Error ? error.message : error,
      );
    }
  }
}
