import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import * as schema from "./schema";

const dbFile = process.env.DATABASE_FILE ?? "./data/database.sqlite";
const absPath = resolve(dbFile);
mkdirSync(dirname(absPath), { recursive: true });

const sqlite = new Database(absPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export * from "./schema";
