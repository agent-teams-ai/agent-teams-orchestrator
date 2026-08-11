import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const creatorPath = path.join(scriptDirectory, "create-doc.mjs");
const validatorPath = path.join(scriptDirectory, "validate-docs.mjs");
const validFixturePath = path.join(scriptDirectory, "fixtures/valid");

async function createFixture() {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "agent-teams-orchestrator-doc-create-"),
  );
  await mkdir(path.join(fixtureRoot, "docs"), { recursive: true });
  await cp(
    path.join(repositoryRoot, "docs/templates"),
    path.join(fixtureRoot, "docs/templates"),
    { recursive: true },
  );
  await writeFile(
    path.join(fixtureRoot, "docs/owners.yaml"),
    "version: 1\nowners:\n  architecture/tooling:\n    kind: architecture\n  example/create-widget:\n    kind: feature\n",
  );
  await writeFile(
    path.join(fixtureRoot, "docs/README.md"),
    "---\nid: docs.index\ntype: index\nstatus: active\nowner: architecture/tooling\nsummary: Fixture documentation entry point for documentation creation tests.\n---\n\n# Documentation\n",
  );
  return fixtureRoot;
}

function runCreator(fixtureRoot, arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [creatorPath, "--root", fixtureRoot, ...arguments_],
      {
        cwd: fixtureRoot,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
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
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}

const adrArguments = [
  "--type",
  "adr",
  "--id",
  "ADR-0083",
  "--title",
  "Deterministic doc creation",
  "--owner",
  "architecture/tooling",
  "--summary",
  "Defines the guarded workflow for creating governed documentation.",
];

async function withFixture(run) {
  const fixtureRoot = await createFixture();
  try {
    await run(fixtureRoot);
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}

test("creates a proposed ADR from the canonical template", async () => {
  await withFixture(async (fixtureRoot) => {
    const result = await runCreator(fixtureRoot, adrArguments);
    assert.equal(result.code, 0, result.output);
    assert.match(
      result.output,
      /Created docs\/decisions\/0083-deterministic-doc-creation\.md/,
    );
    assert.match(result.output, /Run pnpm docs:check before completion/);
    const source = await readFile(
      path.join(
        fixtureRoot,
        "docs/decisions/0083-deterministic-doc-creation.md",
      ),
      "utf8",
    );
    assert.match(source, /^id: ADR-0083$/m);
    assert.match(source, /^status: proposed$/m);
    assert.match(source, /^# ADR-0083: Deterministic doc creation$/m);
    assert.match(source, /^## Rejected alternatives$/m);
  });
});

test("generated ADR passes the complete documentation validator after indexing", async () => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "agent-teams-orchestrator-doc-create-e2e-"),
  );
  try {
    await cp(validFixturePath, fixtureRoot, { recursive: true });
    await cp(
      path.join(repositoryRoot, "docs/templates/adr.md"),
      path.join(fixtureRoot, "docs/templates/adr.md"),
    );
    await cp(
      path.join(repositoryRoot, "docs/metadata.schema.json"),
      path.join(fixtureRoot, "docs/metadata.schema.json"),
    );
    const templateIndexPath = path.join(
      fixtureRoot,
      "docs/templates/README.md",
    );
    await writeFile(
      templateIndexPath,
      `${await readFile(templateIndexPath, "utf8")}\n- [ADR](adr.md)\n`,
    );
    const result = await runCreator(fixtureRoot, [
      "--type",
      "adr",
      "--id",
      "ADR-0002",
      "--title",
      "Generated fixture decision",
      "--owner",
      "architecture",
      "--summary",
      "Defines the generated Architecture Decision Record fixture behavior.",
    ]);
    assert.equal(result.code, 0, result.output);
    const decisionIndexPath = path.join(
      fixtureRoot,
      "docs/decisions/README.md",
    );
    await writeFile(
      decisionIndexPath,
      `${await readFile(decisionIndexPath, "utf8")}\n## Proposed decisions\n\n- [ADR-0002: Generated fixture decision](0002-generated-fixture-decision.md)\n`,
    );

    const validation = await runValidator(fixtureRoot);
    assert.equal(validation.code, 0, validation.output);
    assert.match(validation.output, /Documentation validation passed/);
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});

test("uses the current template body instead of a duplicated skeleton", async () => {
  await withFixture(async (fixtureRoot) => {
    const templatePath = path.join(fixtureRoot, "docs/templates/adr.md");
    const template = await readFile(templatePath, "utf8");
    await writeFile(
      templatePath,
      template.replace(
        "## Rejected alternatives",
        "## Evidence\n\nTemplate-owned evidence.\n\n## Rejected alternatives",
      ),
    );
    const result = await runCreator(fixtureRoot, adrArguments);
    assert.equal(result.code, 0, result.output);
    const source = await readFile(
      path.join(
        fixtureRoot,
        "docs/decisions/0083-deterministic-doc-creation.md",
      ),
      "utf8",
    );
    assert.match(source, /^## Evidence$/m);
    assert.match(source, /Template-owned evidence/);
  });
});

for (const fixture of [
  {
    id: "OD-001",
    output: "docs/open-decisions/OD-001-fixture-choice.md",
    status: "open",
    title: "OD-001: Fixture choice",
    type: "open-decision",
  },
  {
    id: "domain.contexts.example",
    output: "docs/domain/contexts/example/README.md",
    status: "proposed",
    title: "Example Context",
    type: "bounded-context",
  },
  {
    id: "contract.example.widgets.v1",
    output: "docs/contracts/widget-contract-v1.md",
    status: "proposed",
    title: "Widget Contract v1",
    type: "contract",
  },
  {
    id: "runbook.example.widget-outage",
    output: "docs/operations/widget-outage.md",
    status: "active",
    title: "Widget Outage",
    type: "runbook",
  },
]) {
  test(`renders the ${fixture.type} governed template`, async () => {
    await withFixture(async (fixtureRoot) => {
      const result = await runCreator(fixtureRoot, [
        "--type",
        fixture.type,
        "--id",
        fixture.id,
        "--title",
        fixture.title.replace(/^(?:OD-[0-9]{3}: )/, ""),
        "--owner",
        "architecture/tooling",
        "--summary",
        `Defines deterministic ${fixture.type} documentation for the fixture.`,
        "--dry-run",
      ]);
      assert.equal(result.code, 0, result.output);
      assert.match(result.output, new RegExp(`Would create ${fixture.output}`));
      assert.match(result.output, new RegExp(`status: ${fixture.status}`));
      assert.match(result.output, new RegExp(`# ${fixture.title}`));
    });
  });
}

test("dry-run validates and renders without writing", async () => {
  await withFixture(async (fixtureRoot) => {
    const result = await runCreator(fixtureRoot, [...adrArguments, "--dry-run"]);
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /Would create docs\/decisions\/0083-/);
    await assert.rejects(
      stat(
        path.join(
          fixtureRoot,
          "docs/decisions/0083-deterministic-doc-creation.md",
        ),
      ),
      { code: "ENOENT" },
    );
  });
});

test("refuses an unknown owner before writing", async () => {
  await withFixture(async (fixtureRoot) => {
    const commandArguments = adrArguments.map((value) =>
      value === "architecture/tooling" ? "architecture/typo" : value,
    );
    const result = await runCreator(fixtureRoot, commandArguments);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /owner architecture\/typo is not registered/);
  });
});

test("refuses a duplicate stable ID", async () => {
  await withFixture(async (fixtureRoot) => {
    await mkdir(path.join(fixtureRoot, "docs/decisions"), { recursive: true });
    await writeFile(
      path.join(fixtureRoot, "docs/decisions/0083-existing.md"),
      "---\nid: ADR-0083\ntype: adr\nstatus: proposed\nowner: architecture/tooling\nsummary: Existing fixture decision with the same permanent document identifier.\n---\n\n# ADR-0083: Existing\n",
    );
    const result = await runCreator(fixtureRoot, adrArguments);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /document ID ADR-0083 already exists/);
  });
});

test("refuses to overwrite an existing destination", async () => {
  await withFixture(async (fixtureRoot) => {
    const destination = path.join(
      fixtureRoot,
      "docs/decisions/0083-deterministic-doc-creation.md",
    );
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, "not governed\n");
    const result = await runCreator(fixtureRoot, adrArguments);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /already exists; docs:new never overwrites files/);
  });
});

test("creates colocated feature documentation with relations and anchors", async () => {
  await withFixture(async (fixtureRoot) => {
    await mkdir(path.join(fixtureRoot, "docs/open-decisions"), {
      recursive: true,
    });
    await writeFile(
      path.join(fixtureRoot, "docs/open-decisions/OD-001-fixture.md"),
      "---\nid: OD-001\ntype: open-decision\nstatus: open\nowner: architecture/tooling\nsummary: Fixture open decision used to validate generated blocking relationships.\n---\n\n# OD-001: Fixture\n",
    );
    const featureDirectory = path.join(
      fixtureRoot,
      "packages/example/src/features/create-widget",
    );
    await mkdir(featureDirectory, { recursive: true });
    await writeFile(path.join(featureDirectory, "create-widget.ts"), "export {};\n");

    const result = await runCreator(fixtureRoot, [
      "--type",
      "feature",
      "--id",
      "feature.example.create-widget",
      "--title",
      "Create Widget",
      "--owner",
      "example/create-widget",
      "--summary",
      "Documents the owned Create Widget behavior and implementation boundary.",
      "--output",
      "packages/example/src/features/create-widget/README.md",
      "--blocked-by",
      "OD-001",
      "--code-anchor",
      "required:packages/example/src/features/create-widget/*.ts",
    ]);
    assert.equal(result.code, 0, result.output);
    const source = await readFile(path.join(featureDirectory, "README.md"), "utf8");
    assert.match(source, /^related:\n  - OD-001$/m);
    assert.match(source, /^blocked_by:\n  - OD-001$/m);
    assert.match(source, /^code_anchors:\n  - pattern: /m);
    assert.match(source, /^    enforcement: required$/m);
    assert.match(source, /^# Create Widget$/m);
  });
});

test("rejects feature placement outside a feature slice", async () => {
  await withFixture(async (fixtureRoot) => {
    const result = await runCreator(fixtureRoot, [
      "--type",
      "feature",
      "--id",
      "feature.example.create-widget",
      "--title",
      "Create Widget",
      "--owner",
      "example/create-widget",
      "--summary",
      "Documents the owned Create Widget behavior and implementation boundary.",
      "--output",
      "docs/create-widget.md",
    ]);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /feature output must be/);
  });
});

test("fails closed while another documentation write lock exists", async () => {
  await withFixture(async (fixtureRoot) => {
    const lockDirectory = path.join(fixtureRoot, ".agent-teams-local");
    await mkdir(lockDirectory, { recursive: true });
    await writeFile(path.join(lockDirectory, "docs-new.lock"), "fixture\n");
    const result = await runCreator(fixtureRoot, adrArguments);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /another docs:new write is active/);
    await assert.rejects(
      stat(
        path.join(
          fixtureRoot,
          "docs/decisions/0083-deterministic-doc-creation.md",
        ),
      ),
      { code: "ENOENT" },
    );
  });
});
