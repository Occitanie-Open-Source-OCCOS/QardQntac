import path from "node:path";
import { db } from "@/lib/db";

export async function runMigrations() {
  console.log("Running migrations...");
  const migrationsFolder = path.join(process.cwd(), "db/migrations");

  try {
    if (process.env.DATABASE_URL) {
      //@ts-ignore
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      await migrate(db as any, { migrationsFolder });
    } else {
      const { migrate } = await import("drizzle-orm/pglite/migrator");
      await migrate(db as any, { migrationsFolder });
    }
    console.log("Migrations completed successfully.");
  } catch (error) {
    console.error("An error occurred during migrations:", error);
    process.exit(1);
  }
}
