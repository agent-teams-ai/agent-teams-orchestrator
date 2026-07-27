import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const oxlintBinary = path.join(repositoryRoot, "node_modules/.bin/oxlint");

function runOxlint(config, fixture) {
  const result = spawnSync(
    oxlintBinary,
    [
      "--config",
      config,
      "--no-ignore",
      path.join(repositoryRoot, "scripts/lint/fixtures", fixture),
    ],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
    },
  );

  return {
    diagnostics: `${result.stdout}${result.stderr}`,
    status: result.status,
  };
}

test("fast lane accepts valid source", () => {
  const result = runOxlint(".oxlintrc.json", "fast-valid.ts");
  assert.equal(result.status, 0, result.diagnostics);
});

test("fast lane rejects unsafe and mutable source", () => {
  const result = runOxlint(".oxlintrc.json", "fast-invalid.ts");
  assert.notEqual(result.status, 0);
  assert.match(result.diagnostics, /no-eval/u);
  assert.match(result.diagnostics, /no-mutable-exports/u);
});

test("type-aware lane accepts observed promises", () => {
  const result = runOxlint(
    ".oxlintrc.type-aware.json",
    "type-aware-valid.ts",
  );
  assert.equal(result.status, 0, result.diagnostics);
});

test("type-aware lane rejects abandoned promises", () => {
  const result = runOxlint(
    ".oxlintrc.type-aware.json",
    "type-aware-invalid.ts",
  );
  assert.notEqual(result.status, 0);
  assert.match(result.diagnostics, /no-floating-promises/u);
});
