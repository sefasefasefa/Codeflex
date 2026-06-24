import { defineConfig } from "drizzle-kit";

const dbFile = process.env.DATABASE_FILE ?? "./data/database.sqlite";

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: dbFile,
  },
});
