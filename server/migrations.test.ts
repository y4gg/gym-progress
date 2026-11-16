import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

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
const { register } = await import("../instrumentation");
const originalEnv = { ...process.env };

beforeEach(() => {
  connect.mockReset();
  query.mockReset();
  end.mockReset();
  migrate.mockReset();
  process.env.DATABASE_URL = "postgres://localhost/migrations-test";
  process.env.NEXT_RUNTIME = "nodejs";
  delete process.env.NEXT_PHASE;
});

afterEach(() => {
  for (const key of ["DATABASE_URL", "NEXT_RUNTIME", "NEXT_PHASE"]) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

test("startup waits for migrations before becoming ready", async () => {
  let finish!: () => void;
  migrate.mockImplementationOnce(
    () => new Promise<void>((resolve) => { finish = resolve; }),
  );
  let ready = false;
  const startup = register().then(() => { ready = true; });
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

test("a migration failure rejects startup and closes the lock connection", async () => {
  const error = new Error("migration failed");
  migrate.mockRejectedValueOnce(error);
  await expect(register()).rejects.toBe(error);
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
  await expect(register()).rejects.toThrow("DATABASE_URL is required");
  expect(connect).not.toHaveBeenCalled();
});

test("builds and Edge registration do not access the database", async () => {
  process.env.NEXT_PHASE = PHASE_PRODUCTION_BUILD;
  await register();
  delete process.env.NEXT_PHASE;
  process.env.NEXT_RUNTIME = "edge";
  await register();
  expect(connect).not.toHaveBeenCalled();
});
