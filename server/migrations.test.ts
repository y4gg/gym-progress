import { afterEach, beforeEach, expect, mock, test } from "bun:test";

const connect = mock(async () => {});
const query = mock(async () => {});
const end = mock(async () => {});
const migrate = mock(async () => {});
const client = { connect, query, end };

mock.module("pg", () => ({
  Client: class {
    constructor() {
      return client;
    }
  },
}));
mock.module("drizzle-orm/node-postgres", () => ({ drizzle: () => client }));
mock.module("drizzle-orm/node-postgres/migrator", () => ({ migrate }));

const { migrateDatabase } = await import("../db/migrate");
const originalDatabaseUrl = process.env.DATABASE_URL;

beforeEach(() => {
  connect.mockReset();
  query.mockReset();
  end.mockReset();
  migrate.mockReset();
  process.env.DATABASE_URL = "postgres://localhost/migrations-test";
});

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

test("the migration command waits for migrations to finish", async () => {
  let finish!: () => void;
  migrate.mockImplementationOnce(
    () => new Promise<void>((resolve) => { finish = resolve; }),
  );
  let ready = false;
  const startup = migrateDatabase().then(() => { ready = true; });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(migrate).toHaveBeenCalledTimes(1);
  expect(ready).toBe(false);
  expect(end).not.toHaveBeenCalled();
  finish();
  await startup;
  expect(ready).toBe(true);
  expect(end).toHaveBeenCalledTimes(1);
});

test("migrations wait for the database lock", async () => {
  let unlock!: () => void;
  query.mockImplementationOnce(
    () => new Promise<void>((resolve) => { unlock = resolve; }),
  );
  const pending = migrateDatabase();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(migrate).not.toHaveBeenCalled();
  unlock();
  await pending;
  expect(migrate).toHaveBeenCalledTimes(1);
  expect(end).toHaveBeenCalledTimes(1);
});

test("a migration failure rejects and closes the lock connection", async () => {
  const error = new Error("migration failed");
  migrate.mockRejectedValueOnce(error);
  await expect(migrateDatabase()).rejects.toBe(error);
  expect(end).toHaveBeenCalledTimes(1);
});

test("a connection or lock failure closes the client without migrating", async () => {
  for (const operation of [connect, query]) {
    operation.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(migrateDatabase()).rejects.toThrow("database unavailable");
  }
  expect(migrate).not.toHaveBeenCalled();
  expect(end).toHaveBeenCalledTimes(2);
});

test("missing database configuration fails before connecting", async () => {
  delete process.env.DATABASE_URL;
  await expect(migrateDatabase()).rejects.toThrow("DATABASE_URL is required");
  expect(connect).not.toHaveBeenCalled();
});
