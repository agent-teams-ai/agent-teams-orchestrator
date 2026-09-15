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
      typeAware
        ? path.join(repositoryRoot, ".oxlintrc.type-aware.json")
        : conformanceConfig.filePath,
      "--disable-nested-config",
      "--no-ignore",
      path.join(repositoryRoot, "tooling/lint-fixtures", fixture),
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
      path.join(repositoryRoot, "tooling/lint-fixtures", fixture),
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
    readFileSync(path.join(repositoryRoot, ".oxlintrc.common.json"), "utf8"),
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

test("generated fixtures keep maintainability budgets disabled", () => {
  const result = runOxlint(
    ".oxlintrc.json",
    "generated/maintainability-overlap.js",
  );
  assert.equal(result.status, 0, result.diagnostics);
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
  const result = runOxlint(".oxlintrc.json", "vitest-invalid.test.ts");
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

test("local type-aware runner checks explicit conformance inputs", () => {
  const result = runTypeAware("tooling/architecture-conformance-fixtures/valid");
  assert.equal(result.status, 0, result.diagnostics);
  assert.match(
    result.diagnostics,
    /Type-aware lint inputs: [1-9][0-9]* TypeScript file\(s\)\./u,
  );
  assert.doesNotMatch(result.diagnostics, /on 0 files/u);
});

test("local type-aware runner requires explicit paths", () => {
  const result = runTypeAware();
  assert.notEqual(result.status, 0);
  assert.match(result.diagnostics, /requires explicit paths/u);
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

for (const extension of ["tsx", "mts", "cts"]) {
  test(`type-aware lane rejects abandoned promises in ${extension}`, () => {
    const result = runOxlint("type-aware", `type-aware-${extension}-invalid.${extension}`);
    assert.equal(result.status, 1, result.diagnostics);
    assert.match(result.diagnostics, /typescript\(no-floating-promises\)/u);
  });

  test(`type-aware lane accepts observed promises in ${extension}`, () => {
    const result = runOxlint("type-aware", `type-aware-${extension}-valid.${extension}`);
    assert.equal(result.status, 0, result.diagnostics);
  });
}

test("common, fast and typed configs keep separate responsibilities", () => {
  const readConfig = (name) => JSON.parse(readFileSync(path.join(repositoryRoot, name), "utf8"));
  const common = readConfig(".oxlintrc.common.json");
  const fast = readConfig(".oxlintrc.json");
  const typed = readConfig(".oxlintrc.type-aware.json");
  assert.deepEqual(fast.extends, ["./.oxlintrc.common.json"]);
  assert.deepEqual(typed.extends, [...fast.extends,
    "./node_modules/@agent-teams/engineering-foundation/presets/oxlint/type-aware.json"]);
  assert.deepEqual(Object.keys(typed).toSorted(), ["$schema", "extends", "options"]);
  assert.deepEqual(Object.keys(fast).toSorted(), ["$schema", "extends", "ignorePatterns", "jsPlugins", "options", "overrides", "rules", "settings"]);
  assert.deepEqual(fast.jsPlugins, [{ name: "boundaries", specifier: "eslint-plugin-boundaries" }]);
  assert.deepEqual(Object.keys(fast.rules).toSorted(), ["boundaries/dependencies", "boundaries/no-unknown-dependencies"]);
  assert.equal(fast.rules["boundaries/no-unknown-dependencies"], "error");
  assert.equal(fast.rules["boundaries/dependencies"][0], "error");
  assert.ok(fast.settings["boundaries/elements"].length > 0);
  assert.ok(fast.settings["import/resolver"]);
  for (const key of ["jsPlugins", "settings", "options"]) {
    assert.equal(Object.hasOwn(common, key), false);
  }
  for (const rules of [common.rules, ...common.overrides.map((entry) => entry.rules)]) {
    assert.equal(Object.keys(rules).some((name) => name.startsWith("boundaries/")), false);
  }
  assert.deepEqual(fast.options, {
    reportUnusedDisableDirectives: "error",
    respectEslintDisableDirectives: false,
    typeAware: false,
    typeCheck: false,
  });
  assert.deepEqual(typed.options, { ...fast.options, typeAware: true });
  assert.deepEqual(fast.overrides[0].files, ["**/generated/**", "**/vendor/**"]);
  const typescript = common.overrides.find((entry) => entry.files.includes("**/*.{ts,tsx,mts,cts}"));
  assert.ok(typescript, "all four TypeScript extensions must retain strict rules");
  const retainedRules = {
    "typescript/await-thenable": "error",
    "typescript/ban-ts-comment": [
      "error",
      {
        "minimumDescriptionLength": 12,
        "ts-check": false,
        "ts-expect-error": "allow-with-description",
        "ts-ignore": true,
        "ts-nocheck": true
      }
    ],
    "typescript/consistent-type-imports": "error",
    "typescript/no-confusing-void-expression": "error",
    "typescript/no-deprecated": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-floating-promises": "error",
    "typescript/no-import-type-side-effects": "error",
    "typescript/no-invalid-void-type": "error",
    "typescript/no-meaningless-void-operator": "error",
    "typescript/no-misused-promises": "error",
    "typescript/no-non-null-assertion": "error",
    "typescript/no-unnecessary-boolean-literal-compare": "error",
    "typescript/no-unnecessary-template-expression": "error",
    "typescript/no-unnecessary-type-arguments": "error",
    "typescript/no-unnecessary-type-assertion": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/no-unsafe-type-assertion": "error",
    "typescript/only-throw-error": "error",
    "typescript/prefer-as-const": "error",
    "typescript/prefer-nullish-coalescing": "error",
    "typescript/prefer-promise-reject-errors": "error",
    "typescript/related-getter-setter-pairs": "error",
    "typescript/require-array-sort-compare": "error",
    "typescript/restrict-plus-operands": "error",
    "typescript/restrict-template-expressions": "error",
    "typescript/return-await": "error",
    "typescript/strict-boolean-expressions": "error",
    "typescript/strict-void-return": "error",
    "typescript/switch-exhaustiveness-check": "error",
    "typescript/unbound-method": "error",
    "typescript/use-unknown-in-catch-callback-variable": "error"
  };
  for (const [name, setting] of Object.entries(retainedRules)) {
    assert.deepEqual(typescript.rules[name], setting, name);
  }
  for (const rule of Object.values(typescript.rules)) {
    assert.equal(Array.isArray(rule) ? rule[0] : rule, "error");
  }
});
