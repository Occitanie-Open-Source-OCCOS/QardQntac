import { PGlite } from "@electric-sql/pglite";
import {
  drizzle as drizzlePg,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import * as schema from "@/db/schemas/index";

declare global {
  var __db: NodePgDatabase<typeof schema> | undefined;
}

export const db: NodePgDatabase<typeof schema> = (globalThis.__db ??= process
  .env.DATABASE_URL
  ? drizzlePg(new Pool({ connectionString: process.env.DATABASE_URL }), {
      schema,
    })
  : (drizzlePglite(new PGlite("./data/local.db"), {
      schema,
    }) as unknown as NodePgDatabase<typeof schema>));
