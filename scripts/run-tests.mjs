import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

function findTests(directory) {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? findTests(path)
        : /\.test\.(tsx?|mjs)$/.test(entry.name)
          ? [path]
          : [];
    },
  );
}

const tests = ["app", "components", "lib", "server", "scripts"]
  .flatMap(findTests)
  .sort();
let failures = 0;

// Each file gets a fresh process: Bun module mocks and DOM globals are shared
// within a process, so running all UI suites together changes their behavior.
for (const test of tests) {
  const isNodeTest = test.endsWith(".mjs");
  const result = spawnSync(
    isNodeTest ? process.execPath : "bun",
    [isNodeTest ? "--test" : "test", `./${test}`],
    { cwd: root, stdio: "inherit" },
  );
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) failures += 1;
}

console.log(`\n${tests.length - failures}/${tests.length} test files passed.`);
process.exitCode = failures > 0 ? 1 : 0;
