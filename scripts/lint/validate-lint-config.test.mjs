import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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
const readConfig = (name) => JSON.parse(readFileSync(path.join(repositoryRoot, name), "utf8"));
const topology = readConfig("architecture/foundation/quality-feature-topology.json");

after(() => {
  conformanceConfig.dispose();
});

function runOxlint(config, fixture) {
  if (config === "type-aware") {
    return lintMappedSource(topology.modules[0].sourceRoot, fixture,
      readFileSync(path.join(repositoryRoot, "tooling/lint-fixtures", fixture), "utf8"));
  }
  const result = spawnSync(
    oxlintBinary,
    [
      "--config",
      conformanceConfig.filePath,
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

test("effective mapped budgets and normal tooling budgets retain all five ceilings", () => {
  const body = ["export function budget(a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean) {",
    "let result = 0;", ...["a", "b", "c", "d", "e"].map((flag) => `if (${flag}) {`),
    "result += f ? 1 : 0;", "}}}}}", ...Array.from({ length: 16 }, () => "if (a) { result += 1; }"),
    ...Array.from({ length: 170 }, () => "result += 1;"), "return result;", "}",
    ...Array.from({ length: 320 }, (_, index) => `export const value${index} = ${index};`)].join("\n");
  for (const module of topology.modules) {
    const production = lintMappedSource(module.sourceRoot, "budget.test.ts", body);
    assert.equal(production.status, 1, production.diagnostics);
    for (const rule of ["complexity", "max-depth", "max-lines", "max-lines-per-function", "max-params"]) {
      assert.ok(production.diagnostics.includes(`(${rule})`), production.diagnostics);
    }
    for (const root of module.testRoots) {
      const tests = lintMappedSource(root, "budget.test.ts", body);
      assert.equal(tests.status, 0, tests.diagnostics);
    }
  }
  for (const [root, name, status] of [["scripts/lint", "budget.test.mjs", 0],
    ["scripts/lint/fixtures", "budget.mjs", 0], ["tooling/architecture-conformance", "budget.mjs", 0],
    ["scripts/lint", "budget.mjs", 1]]) {
    const result = lintMappedSource(root, name, body.replaceAll(": boolean", ""), ".oxlintrc.common.json");
    assert.equal(result.status, status, result.diagnostics);
  }
});

test("typed mapped core layers retain ambient effect protection", () => {
  for (const module of topology.modules) {
    for (const layer of ["application", "domain", "contracts", "projections"]) {
      const result = lintMappedSource(`${module.sourceRoot}/features/probe/${layer}`, "impure.ts",
        "export const now = Date.now();\nexport const random = Math.random();\n");
      assert.equal(result.status, 1, result.diagnostics);
      assert.match(result.diagnostics, /no-restricted-globals/u);
      assert.match(result.diagnostics, /no-restricted-properties/u);
    }
  }
});

// Exercise the real typed selectors in a disposable consumer, with the installed
// dependency tree read through a link. Never plant test inputs in product source.
function lintMappedSource(target, name, source, config = ".oxlintrc.type-aware.json") {
  const root = mkdtempSync(path.join(os.tmpdir(), "orchestrator-TEST-lint-"));
  try {
    for (const file of [".oxlintrc.base.json", ".oxlintrc.common.json", ".oxlintrc.type-aware.json"]) {
      cpSync(path.join(repositoryRoot, file), path.join(root, file));
    }
    symlinkSync(path.join(repositoryRoot, "node_modules"), path.join(root, "node_modules"), "dir");
    const input = path.join(root, target, name);
    mkdirSync(path.dirname(input), { recursive: true });
    writeFileSync(input, source);
    writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext", strict: true, noEmit: true, target: "ES2024" },
      include: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    }));
    const result = spawnSync(oxlintBinary, ["--config", config, "--disable-nested-config", "--no-ignore", input],
      { cwd: root, encoding: "utf8", timeout: 60_000 });
    assert.equal(result.error, undefined, result.stderr);
    return { status: result.status, diagnostics: `${result.stdout}${result.stderr}` };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
    readFileSync(path.join(repositoryRoot, ".oxlintrc.base.json"), "utf8"),
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
  assert.deepEqual(readConfig("node_modules/@agent-teams/engineering-foundation/presets/oxlint/maintainability.json").rules, {
    complexity: ["error", 20], "max-depth": ["error", 4],
    "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
    "max-lines-per-function": ["error", { max: 150, skipBlankLines: true, skipComments: true }],
    "max-params": ["error", 5],
  });
  const testOverride = readConfig(".oxlintrc.common.json").overrides.find((override) =>
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
  const common = readConfig(".oxlintrc.common.json");
  const fast = readConfig(".oxlintrc.json");
  const typed = readConfig(".oxlintrc.type-aware.json");
  const base = readConfig(".oxlintrc.base.json");
  assert.deepEqual(fast.extends, ["./.oxlintrc.common.json"]);
  assert.deepEqual(common.extends, ["./.oxlintrc.base.json"]);
  assert.deepEqual(typed.extends, common.extends.concat(
    "./node_modules/@agent-teams/engineering-foundation/presets/oxlint/type-aware.json"));
  assert.deepEqual(Object.keys(typed).toSorted(), ["$schema", "extends", "options", "overrides"]);
  assert.deepEqual(Object.keys(common).toSorted(), ["$schema", "extends", "overrides"]);
  assert.equal(Object.hasOwn(base, "overrides"), false);
  assert.deepEqual(typed.overrides.map(({ rules }) => rules), common.overrides.map(({ rules }) => rules));
  const sourceRoots = topology.modules.map(({ sourceRoot }) => sourceRoot);
  const testRoots = topology.modules.flatMap(({ testRoots: moduleTestRoots }) => moduleTestRoots);
  assert.deepEqual(typed.overrides.map(({ files }) => files), [
    testRoots.map((root) => `${root}/**`),
    [...sourceRoots, ...testRoots].map((root) => `${root}/**/*.{ts,tsx,mts,cts}`),
    sourceRoots.flatMap((root) => ["application", "domain", "contracts", "projections"]
      .map((layer) => `${root}/features/*/${layer}/**/*.{ts,tsx,mts,cts}`)),
  ]);
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
  for (const rules of [base.rules, ...common.overrides.map((entry) => entry.rules)]) {
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
