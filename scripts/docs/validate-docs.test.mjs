import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const validatorPath = path.join(scriptDirectory, "validate-docs.mjs");
const validFixturePath = path.join(scriptDirectory, "fixtures/valid");

async function createFixture() {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "agent-teams-orchestrator-docs-"),
  );
  await cp(validFixturePath, fixtureRoot, { recursive: true });
  await cp(
    path.join(repositoryRoot, "docs/metadata.schema.json"),
    path.join(fixtureRoot, "docs/metadata.schema.json"),
  );
  return fixtureRoot;
}

function runValidator(fixtureRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [validatorPath], {
      cwd: fixtureRoot,
      env: {
        ...process.env,
        DOCS_REPOSITORY_ROOT: fixtureRoot,
        DOCS_SKIP_MERMAID: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, output: `${stdout}\n${stderr}` });
    });
  });
}

async function withFixture(change, assertion) {
  const fixtureRoot = await createFixture();
  try {
    await change(fixtureRoot);
    const result = await runValidator(fixtureRoot);
    assertion(result);
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}

async function replaceInFile(filePath, before, after) {
  const source = await readFile(filePath, "utf8");
  assert.ok(source.includes(before), `fixture source does not contain ${before}`);
  await writeFile(filePath, source.replace(before, after));
}

test("accepts the repository documentation fixture", async () => {
  await withFixture(
    async () => {},
    ({ code, output }) => {
      assert.equal(code, 0, output);
      assert.match(output, /Documentation validation passed/);
    },
  );
});

test("rejects a child documentation directory without an index", async () => {
  await withFixture(
    (fixtureRoot) =>
      unlink(path.join(fixtureRoot, "docs/templates/README.md")),
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(
        output,
        /docs\/templates\/README\.md: child documentation directory requires README\.md/,
      );
    },
  );
});

test("rejects multiple level-one titles", async () => {
  await withFixture(
    async (fixtureRoot) => {
      const filePath = path.join(fixtureRoot, "docs/glossary.md");
      const source = await readFile(filePath, "utf8");
      await writeFile(filePath, `${source}\n# Duplicate title\n`);
    },
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /expected exactly one level-one heading, found 2/);
    },
  );
});

test("rejects metadata drift in an index table", async () => {
  await withFixture(
    (fixtureRoot) =>
      replaceInFile(
        path.join(fixtureRoot, "docs/open-decisions/README.md"),
        "| OD-001 | [Fixture decision](OD-001-fixture-decision.md) | platform/eventing | Resolved by ADR-0001 |",
        "| OD-001 | [Fixture decision](OD-001-fixture-decision.md) | wrong/owner | Resolved by ADR-0001 |",
      ),
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /table owner for OD-001 must be platform\/eventing/);
    },
  );
});

test("rejects an unregistered documentation owner", async () => {
  await withFixture(
    (fixtureRoot) =>
      replaceInFile(
        path.join(fixtureRoot, "docs/glossary.md"),
        "owner: architecture",
        "owner: architecture/typo",
      ),
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(
        output,
        /owner architecture\/typo is not registered in docs\/owners\.yaml/,
      );
    },
  );
});

test("rejects ADR lifecycle placement drift", async () => {
  await withFixture(
    (fixtureRoot) =>
      replaceInFile(
        path.join(fixtureRoot, "docs/decisions/README.md"),
        "## Accepted decisions",
        "## Current decisions",
      ),
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /accepted ADR must be listed under "accepted decisions"/);
    },
  );
});

test("rejects a resolved decision without a deciding ADR", async () => {
  await withFixture(
    (fixtureRoot) =>
      replaceInFile(
        path.join(
          fixtureRoot,
          "docs/open-decisions/OD-001-fixture-decision.md",
        ),
        "resolved_by: ADR-0001\n",
        "",
      ),
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /resolved open decision requires resolved_by/);
    },
  );
});

test("discovers unlinked colocated feature documentation", async () => {
  await withFixture(
    async (fixtureRoot) => {
      const featureDirectory = path.join(
        fixtureRoot,
        "packages/contexts/example/src/features/example",
      );
      await mkdir(featureDirectory, { recursive: true });
      await writeFile(
        path.join(featureDirectory, "README.md"),
        `---
id: feature.example.example
type: feature
status: proposed
owner: example/example
summary: Example colocated feature documentation used by the validator fixture.
---

# Example Feature
`,
      );
    },
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(
        output,
        /packages\/contexts\/example\/src\/features\/example\/README\.md: unreachable from docs\/README\.md/,
      );
    },
  );
});

test("rejects an ADR without its required semantic structure", async () => {
  await withFixture(
    (fixtureRoot) =>
      replaceInFile(
        path.join(
          fixtureRoot,
          "docs/decisions/0001-fixture-decision.md",
        ),
        "## Context",
        "## Background",
      ),
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /missing required heading "## Context"/);
    },
  );
});

test("rejects a code anchor that escapes the repository", async () => {
  await withFixture(
    (fixtureRoot) =>
      replaceInFile(
        path.join(fixtureRoot, "docs/glossary.md"),
        "summary: Minimal glossary document used by documentation validator fixtures.\n",
        "summary: Minimal glossary document used by documentation validator fixtures.\ncode_anchors:\n  - pattern: ../outside/**\n    enforcement: advisory\n",
      ),
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /pattern must not escape the repository root/);
    },
  );
});

test("rejects a stale code anchor", async () => {
  await withFixture(
    (fixtureRoot) =>
      replaceInFile(
        path.join(fixtureRoot, "docs/glossary.md"),
        "summary: Minimal glossary document used by documentation validator fixtures.\n",
        "summary: Minimal glossary document used by documentation validator fixtures.\ncode_anchors:\n  - pattern: src/missing/**\n    enforcement: advisory\n",
      ),
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /stale code anchor src\/missing\/\*\*/);
    },
  );
});

test("rejects conflicting enforcement for one code anchor pattern", async () => {
  await withFixture(
    async (fixtureRoot) => {
      await mkdir(path.join(fixtureRoot, "src"), { recursive: true });
      await writeFile(path.join(fixtureRoot, "src/example.ts"), "export {};\n");
      await replaceInFile(
        path.join(fixtureRoot, "docs/glossary.md"),
        "summary: Minimal glossary document used by documentation validator fixtures.\n",
        "summary: Minimal glossary document used by documentation validator fixtures.\ncode_anchors:\n  - pattern: src/**\n    enforcement: advisory\n  - pattern: src/**\n    enforcement: required\n",
      );
    },
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /duplicate code anchor pattern src\/\*\*/);
    },
  );
});
