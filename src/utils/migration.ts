import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/lib/db";

export async function runMigrations() {
	console.log("Running migrations...");

	try {
		const migrationsFolder = path.join(process.cwd(), "db/migrations");
		await migrate(db, { migrationsFolder });
		console.log("Migrations completed successfully.");
	} catch (error) {
		console.error("An error occured :", error);
		process.exit(1);
	}
}
