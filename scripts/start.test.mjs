import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const startup = fileURLToPath(new URL("./start.sh", import.meta.url));

function runStartup(migrationExit, serverArgs, serverExit = 0) {
  const directory = mkdtempSync(join(tmpdir(), "gym-progress-start-"));
  const log = join(directory, "commands.jsonl");
  try {
    writeFileSync(join(directory, "bun"), `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.STARTUP_TEST_LOG, JSON.stringify(args) + "\\n");
process.exit(args[0] === "scripts/migrate.mjs"
  ? Number(process.env.STARTUP_TEST_MIGRATION_EXIT)
  : Number(process.env.STARTUP_TEST_SERVER_EXIT));
`, { mode: 0o755 });
    const result = spawnSync("sh", [startup, ...serverArgs], {
      env: {
        ...process.env,
        PATH: directory + delimiter + process.env.PATH,
        STARTUP_TEST_LOG: log,
        STARTUP_TEST_MIGRATION_EXIT: String(migrationExit),
        STARTUP_TEST_SERVER_EXIT: String(serverExit),
      },
      encoding: "utf8",
    });
    assert.ifError(result.error);
    return {
      status: result.status,
      commands: readFileSync(log, "utf8").trim().split("\n").map(JSON.parse),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("package startup migrates first and forwards Next.js arguments to Bun", () => {
  assert.deepEqual(runStartup(0, ["--bun", "next", "start", "--port", "4000"]), {
    status: 0,
    commands: [["scripts/migrate.mjs"], ["--bun", "next", "start", "--port", "4000"]],
  });
});

test("Docker startup migrates first and preserves the server exit status", () => {
  assert.deepEqual(runStartup(0, ["server.js"], 3), {
    status: 3,
    commands: [["scripts/migrate.mjs"], ["server.js"]],
  });
});

test("migration failure stops startup before launching either server", () => {
  for (const args of [["server.js"], ["--bun", "next", "start"]]) {
    assert.deepEqual(runStartup(7, args), {
      status: 7,
      commands: [["scripts/migrate.mjs"]],
    });
  }
});
