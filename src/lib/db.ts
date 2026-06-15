import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import * as schema from "@/db/schemas/index";

declare global {
	// eslint-disable-next-line no-var
	var __db: NodePgDatabase<typeof schema> | undefined;
}

function createClient(): NodePgDatabase<typeof schema> {
	if (process.env.DATABASE_URL) {
		return drizzlePg(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });
	}
	const dbPath = resolve(process.cwd(), "data", "local.db");
	mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
	return drizzlePglite(new PGlite(dbPath), { schema }) as unknown as NodePgDatabase<typeof schema>;
}

export const db: NodePgDatabase<typeof schema> = globalThis.__db ?? (globalThis.__db = createClient());
