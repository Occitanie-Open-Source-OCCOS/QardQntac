import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./db/migrations",
  schema: "./db/schemas",
  dialect: "postgresql",
  driver: process.env.DATABASE_URL ? undefined : "pglite",
  dbCredentials: {
    url: process.env.DATABASE_URL
      ? process.env.DATABASE_URL
      : "./data/local.db",
  },
});
