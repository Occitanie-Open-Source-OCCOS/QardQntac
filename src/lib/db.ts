import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { dbConfig } from "@/config/database";
import * as schema from "@/db/schemas/index";

const pool = new Pool({
	connectionString: dbConfig.url,
	//ssl: dbConfig.ssl,
});

export const db = drizzle(pool, { schema });
