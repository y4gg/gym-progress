import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

export async function migrateDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run database migrations.");
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
  });

  try {
    await client.connect();
    // All app instances use the same session lock, held through Drizzle's
    // migration transaction. Closing this dedicated connection releases it.
    await client.query("SELECT pg_advisory_lock(1819897197, 1)");
    console.info("Applying database migrations...");
    await migrate(drizzle(client), {
      migrationsFolder: join(process.cwd(), "drizzle"),
    });
    console.info("Database migrations complete.");
  } finally {
    await client.end();
  }
}
