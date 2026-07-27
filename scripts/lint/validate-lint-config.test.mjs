import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const oxlintBinary = path.join(repositoryRoot, "node_modules/.bin/oxlint");
const typeAwareRunner = path.join(scriptDirectory, "run-type-aware.mjs");

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

function runTypeAware(...targets) {
  const result = spawnSync(process.execPath, [typeAwareRunner, ...targets], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

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
  assert.match(result.diagnostics, /no-explicit-any/u);
  assert.match(result.diagnostics, /no-non-null-assertion/u);
});

test("fast lane rejects focused, disabled, and assertion-free tests", () => {
  const result = runOxlint(".oxlintrc.json", "vitest-invalid.ts");
  assert.notEqual(result.status, 0);
  assert.match(result.diagnostics, /no-focused-tests/u);
  assert.match(result.diagnostics, /no-disabled-tests/u);
  assert.match(result.diagnostics, /expect-expect/u);
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

test("type-aware lane rejects unsafe assertions and nullable shortcuts", () => {
  const result = runOxlint(
    ".oxlintrc.type-aware.json",
    "type-aware-strict-invalid.ts",
  );
  assert.notEqual(result.status, 0);
  assert.match(result.diagnostics, /no-unsafe-type-assertion/u);
  assert.match(result.diagnostics, /prefer-nullish-coalescing/u);
});

test("core purity rules reject ambient side effects", () => {
  const result = runOxlint(
    ".oxlintrc.json",
    "core-purity/domain/invalid.ts",
  );
  assert.notEqual(result.status, 0);
  assert.match(result.diagnostics, /no-restricted-globals/u);
  assert.match(result.diagnostics, /no-restricted-properties/u);
});

test("core purity rules accept deterministic domain logic", () => {
  const result = runOxlint(
    ".oxlintrc.json",
    "core-purity/domain/valid.ts",
  );
  assert.equal(result.status, 0, result.diagnostics);
});

test("type-aware runner proves that production roots are not empty", () => {
  const result = runTypeAware();
  assert.equal(result.status, 0, result.diagnostics);
  assert.match(
    result.diagnostics,
    /Type-aware lint inputs: [1-9][0-9]* TypeScript file\(s\)\./u,
  );
  assert.doesNotMatch(result.diagnostics, /on 0 files/u);
});

test("type-aware runner fails closed on an empty target", () => {
  const emptyDirectory = mkdtempSync(
    path.join(os.tmpdir(), "orchestrator-empty-lint-"),
  );
  try {
    const result = runTypeAware(emptyDirectory);
    assert.notEqual(result.status, 0);
    assert.match(
      result.diagnostics,
      /refused to pass without TypeScript inputs/u,
    );
  } finally {
    rmSync(emptyDirectory, { recursive: true });
  }
});
