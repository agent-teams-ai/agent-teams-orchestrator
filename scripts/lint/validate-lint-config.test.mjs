import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";

import { createConformanceOxlintConfig } from "./create-conformance-config.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const oxlintBinary = path.join(repositoryRoot, "node_modules/.bin/oxlint");
const typeAwareRunner = path.join(scriptDirectory, "run-type-aware.mjs");
const suppressionValidator = path.join(
  scriptDirectory,
  "validate-suppressions.mjs",
);
const conformanceConfig = createConformanceOxlintConfig(repositoryRoot);

after(() => {
  conformanceConfig.dispose();
});

function runOxlint(config, fixture) {
  const typeAware = config === "type-aware";
  const result = spawnSync(
    oxlintBinary,
    [
      "--config",
      conformanceConfig.filePath,
      "--disable-nested-config",
      "--no-ignore",
      ...(typeAware ? ["--type-aware"] : []),
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

function validateSuppressions(fixture) {
  const result = spawnSync(
    process.execPath,
    [
      suppressionValidator,
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

test("blocking and advisory lanes exclude the same non-production fixtures", () => {
  const blockingConfig = JSON.parse(
    readFileSync(path.join(repositoryRoot, ".oxlintrc.json"), "utf8"),
  );
  const advisoryConfig = JSON.parse(
    readFileSync(
      path.join(repositoryRoot, ".oxlintrc.advisory.json"),
      "utf8",
    ),
  );

  assert.deepEqual(advisoryConfig.ignorePatterns, blockingConfig.ignorePatterns);
});

test("maintainability profiles stay aligned with Foundation", () => {
  const blockingConfig = JSON.parse(
    readFileSync(path.join(repositoryRoot, ".oxlintrc.json"), "utf8"),
  );
  const foundationTestProfile = JSON.parse(
    readFileSync(
      path.join(
        repositoryRoot,
        "node_modules/@agent-teams/engineering-foundation/presets/oxlint/maintainability-tests.json",
      ),
      "utf8",
    ),
  );
  assert.ok(
    blockingConfig.extends.includes(
      "./node_modules/@agent-teams/engineering-foundation/presets/oxlint/maintainability.json",
    ),
    "production maintainability preset must stay explicit",
  );
  const testOverride = blockingConfig.overrides.find((override) =>
    override.files?.includes("packages/**/tests/**"),
  );
  assert.ok(testOverride, "test maintainability override must exist");
  assert.deepEqual(testOverride.rules, foundationTestProfile.rules);
});

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

test("nested configuration cannot weaken the root policy", () => {
  const result = runOxlint(
    ".oxlintrc.json",
    "nested-bypass/invalid.ts",
  );
  assert.notEqual(result.status, 0);
  assert.match(result.diagnostics, /no-eval/u);
});

test("fast lane rejects focused, disabled, and assertion-free tests", () => {
  const result = runOxlint(".oxlintrc.json", "vitest-invalid.ts");
  assert.notEqual(result.status, 0);
  assert.match(result.diagnostics, /no-focused-tests/u);
  assert.match(result.diagnostics, /no-disabled-tests/u);
  assert.match(result.diagnostics, /expect-expect/u);
});

test("fast lane rejects common correctness and performance mistakes", () => {
  const result = runOxlint(".oxlintrc.json", "best-practices-invalid.ts");
  assert.notEqual(result.status, 0);
  assert.match(result.diagnostics, /array-callback-return/u);
  assert.match(result.diagnostics, /no-prototype-builtins/u);
  assert.match(result.diagnostics, /no-accumulating-spread/u);
  assert.match(result.diagnostics, /no-promise-executor-return/u);
  assert.match(result.diagnostics, /ban-ts-comment/u);
});

test("type-aware lane accepts observed promises", () => {
  const result = runOxlint(
    "type-aware",
    "type-aware-valid.ts",
  );
  assert.equal(result.status, 0, result.diagnostics);
});

test("type-aware lane rejects abandoned promises", () => {
  const result = runOxlint(
    "type-aware",
    "type-aware-invalid.ts",
  );
  assert.notEqual(result.status, 0);
  assert.match(result.diagnostics, /no-floating-promises/u);
});

test("type-aware lane rejects unsafe assertions and nullable shortcuts", () => {
  const result = runOxlint(
    "type-aware",
    "type-aware-strict-invalid.ts",
  );
  assert.notEqual(result.status, 0);
  assert.match(result.diagnostics, /no-unsafe-type-assertion/u);
  assert.match(result.diagnostics, /prefer-nullish-coalescing/u);
  assert.match(result.diagnostics, /no-invalid-void-type/u);
  assert.match(result.diagnostics, /prefer-promise-reject-errors/u);
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

test("suppression policy accepts a narrow explained exception", () => {
  const result = validateSuppressions("suppressions-valid.ts");
  assert.equal(result.status, 0, result.diagnostics);
});

test("suppression policy rejects blanket, unexplained, and protected bypasses", () => {
  const result = validateSuppressions("suppressions-invalid.ts");
  assert.notEqual(result.status, 0);
  assert.match(result.diagnostics, /only a rule-scoped next-line/u);
  assert.match(result.diagnostics, /eslint suppression directives/u);
  assert.match(result.diagnostics, /requires a preceding explanatory comment/u);
  assert.match(result.diagnostics, /cannot be suppressed locally/u);
});
