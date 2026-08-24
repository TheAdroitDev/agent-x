import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { env } from "@/common/config/env";

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });

export type Database = typeof db;
export * from "./schema";
