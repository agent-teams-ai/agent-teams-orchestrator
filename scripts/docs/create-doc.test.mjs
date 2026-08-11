import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const creatorPath = path.join(scriptDirectory, "create-doc.mjs");
const queryPath = path.join(scriptDirectory, "query-docs.mjs");
const validatorPath = path.join(scriptDirectory, "validate-docs.mjs");
const validFixturePath = path.join(scriptDirectory, "fixtures/valid");
const goldenFixtureRoot = path.join(
  scriptDirectory,
  "fixtures/create-doc-golden",
);
const goldenManifest = JSON.parse(
  await readFile(
    path.join(scriptDirectory, "fixtures/create-doc-golden-v1.json"),
    "utf8",
  ),
);

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

function runQuery(arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [queryPath, ...arguments_], {
      cwd: repositoryRoot,
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

function expectedNextSteps(repositoryPath, indexPath) {
  return `Next steps:
  1. Complete every applicable template section without inventing facts.
  2. Create or update ${indexPath}, link ${repositoryPath}, and update stable-ID relationships.
  3. Run pnpm docs:impact while iterating.
  4. Run pnpm docs:check before completion.
`;
}

async function prepareGoldenSetup(fixtureRoot, setup) {
  if (setup !== "relations-and-anchor") {
    return;
  }
  await mkdir(path.join(fixtureRoot, "docs/decisions"), { recursive: true });
  await writeFile(
    path.join(fixtureRoot, "docs/decisions/0001-frozen.md"),
    "---\nid: ADR-0001\ntype: adr\nstatus: accepted\nowner: architecture/tooling\nsummary: Existing frozen decision for relationship characterization.\n---\n\n# ADR-0001: Frozen\n",
  );
  await mkdir(path.join(fixtureRoot, "docs/open-decisions"), {
    recursive: true,
  });
  await writeFile(
    path.join(fixtureRoot, "docs/open-decisions/OD-001-frozen.md"),
    "---\nid: OD-001\ntype: open-decision\nstatus: open\nowner: architecture/tooling\nsummary: Existing frozen choice for blocking relationship characterization.\n---\n\n# OD-001: Frozen\n",
  );
  const featureDirectory = path.join(
    fixtureRoot,
    "packages/example/src/features/create-widget",
  );
  await mkdir(featureDirectory, { recursive: true });
  await writeFile(path.join(featureDirectory, "create-widget.ts"), "export {};\n");
}

for (const goldenCase of goldenManifest.cases) {
  test(`freezes exact ${goldenCase.name} path, bytes, field order, and CLI output`, async () => {
    await withFixture(async (fixtureRoot) => {
      await prepareGoldenSetup(fixtureRoot, goldenCase.setup);
      const expectedSource = await readFile(
        path.join(goldenFixtureRoot, path.basename(goldenCase.sourceFixture)),
        "utf8",
      );
      const nextSteps = expectedNextSteps(
        goldenCase.path,
        goldenCase.indexPath,
      );

      const dryRun = await runCreator(fixtureRoot, [
        ...goldenCase.args,
        "--dry-run",
      ]);
      assert.deepEqual(dryRun, {
        code: 0,
        output: `Would create ${goldenCase.path}:\n\n${expectedSource}\n${nextSteps}`,
      });

      const created = await runCreator(fixtureRoot, goldenCase.args);
      assert.deepEqual(created, {
        code: 0,
        output: `Created ${goldenCase.path} from docs/templates/${goldenCase.template}.\n${nextSteps}`,
      });
      assert.equal(
        await readFile(path.join(fixtureRoot, goldenCase.path), "utf8"),
        expectedSource,
      );
    });
  });
}

test("freezes docs:new and docs:query exit-code contracts", async () => {
  await withFixture(async (fixtureRoot) => {
    const [createHelp, createInvalid, createSuccess] = await Promise.all([
      runCreator(fixtureRoot, ["--help"]),
      runCreator(fixtureRoot, ["--type", "unknown"]),
      runCreator(fixtureRoot, [...adrArguments, "--dry-run"]),
    ]);
    assert.equal(createHelp.code, 0);
    assert.equal(createInvalid.code, 1);
    assert.equal(createSuccess.code, 0);
  });

  const [queryHelp, queryInvalid, queryMissing, queryMissingJson, querySuccess] =
    await Promise.all([
      runQuery(["--help"]),
      runQuery(["--unknown"]),
      runQuery(["--id", "characterization.missing.document"]),
      runQuery(["--id", "characterization.missing.document", "--json"]),
      runQuery(["--id", "docs.index", "--json"]),
    ]);
  assert.equal(queryHelp.code, 0);
  assert.equal(queryInvalid.code, 2);
  assert.deepEqual(queryMissing, { code: 1, output: "" });
  assert.deepEqual(queryMissingJson, { code: 1, output: "[]\n" });
  assert.equal(querySuccess.code, 0, querySuccess.output);
});

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

test("rejects a destination ancestor that resolves outside through a symlink", async () => {
  const externalRoot = await mkdtemp(
    path.join(tmpdir(), "agent-teams-orchestrator-doc-external-"),
  );
  try {
    await withFixture(async (fixtureRoot) => {
      await symlink(
        externalRoot,
        path.join(fixtureRoot, "docs/decisions"),
        process.platform === "win32" ? "junction" : "dir",
      );
      const result = await runCreator(fixtureRoot, adrArguments);
      assert.equal(result.code, 1, result.output);
      assert.match(
        result.output,
        /destination resolves outside the repository through a symlink/,
      );
      await assert.rejects(
        stat(path.join(externalRoot, "0083-deterministic-doc-creation.md")),
        { code: "ENOENT" },
      );
    });
  } finally {
    await rm(externalRoot, { force: true, recursive: true });
  }
});

test("characterizes the current symlinked template and owner input baseline", async () => {
  const externalRoot = await mkdtemp(
    path.join(tmpdir(), "agent-teams-orchestrator-doc-inputs-"),
  );
  try {
    await withFixture(async (fixtureRoot) => {
      const externalTemplates = path.join(externalRoot, "templates");
      await mkdir(externalTemplates, { recursive: true });
      await cp(
        path.join(fixtureRoot, "docs/templates/adr.md"),
        path.join(externalTemplates, "adr.md"),
      );
      await rm(path.join(fixtureRoot, "docs/templates"), {
        force: true,
        recursive: true,
      });
      await symlink(
        externalTemplates,
        path.join(fixtureRoot, "docs/templates"),
        process.platform === "win32" ? "junction" : "dir",
      );

      const templateResult = await runCreator(fixtureRoot, [
        ...adrArguments,
        "--dry-run",
      ]);
      assert.equal(templateResult.code, 0, templateResult.output);

      if (process.platform !== "win32") {
        const externalOwners = path.join(externalRoot, "owners.yaml");
        await cp(path.join(fixtureRoot, "docs/owners.yaml"), externalOwners);
        await unlink(path.join(fixtureRoot, "docs/owners.yaml"));
        await symlink(externalOwners, path.join(fixtureRoot, "docs/owners.yaml"));
        const ownerResult = await runCreator(fixtureRoot, [
          ...adrArguments,
          "--dry-run",
        ]);
        assert.equal(ownerResult.code, 0, ownerResult.output);
      }
    });
  } finally {
    await rm(externalRoot, { force: true, recursive: true });
  }
});

test("freezes template extraction failures", async () => {
  const cases = [
    {
      source: "# No markdown skeleton\n",
      error: /must contain exactly one markdown skeleton/,
    },
    {
      source: "```markdown\n# First\n```\n\n```markdown\n# Second\n```\n",
      error: /must contain exactly one markdown skeleton/,
    },
    {
      source: "```markdown\n---\nid: ADR-NNNN\n---\n\nNo title\n```\n",
      error: /skeleton is missing a title/,
    },
  ];

  for (const fixture of cases) {
    await withFixture(async (fixtureRoot) => {
      await writeFile(
        path.join(fixtureRoot, "docs/templates/adr.md"),
        fixture.source,
      );
      const result = await runCreator(fixtureRoot, [
        ...adrArguments,
        "--dry-run",
      ]);
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, fixture.error);
    });
  }
});

test("normalizes a CRLF template to the frozen LF document bytes", async () => {
  await withFixture(async (fixtureRoot) => {
    const templatePath = path.join(fixtureRoot, "docs/templates/adr.md");
    const source = await readFile(templatePath, "utf8");
    await writeFile(
      templatePath,
      source.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n"),
    );
    const result = await runCreator(fixtureRoot, adrArguments);
    assert.equal(result.code, 0, result.output);
    assert.equal(
      await readFile(
        path.join(
          fixtureRoot,
          "docs/decisions/0083-deterministic-doc-creation.md",
        ),
        "utf8",
      ),
      await readFile(path.join(goldenFixtureRoot, "adr.md"), "utf8").then(
        (golden) =>
          golden
            .replaceAll("ADR-9001", "ADR-0083")
            .replaceAll("Frozen ADR", "Deterministic doc creation")
            .replace(
              "Freezes the current ADR document creation contract.",
              "Defines the guarded workflow for creating governed documentation.",
            ),
      ),
    );
  });
});

test("freezes duplicate YAML failure and permissive malformed frontmatter handling", async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFile(
      path.join(fixtureRoot, "docs/owners.yaml"),
      "version: 1\nowners:\n  architecture/tooling:\n    kind: architecture\nowners:\n  architecture/tooling:\n    kind: architecture\n",
    );
    const duplicateKeys = await runCreator(fixtureRoot, [
      ...adrArguments,
      "--dry-run",
    ]);
    assert.equal(duplicateKeys.code, 1, duplicateKeys.output);
    assert.match(duplicateKeys.output, /Map keys must be unique/);
  });

  await withFixture(async (fixtureRoot) => {
    await writeFile(
      path.join(fixtureRoot, "docs/malformed.md"),
      "---\nid: [\ntype: adr\n---\n\n# Malformed\n",
    );
    const malformedFrontmatter = await runCreator(fixtureRoot, [
      ...adrArguments,
      "--dry-run",
    ]);
    assert.equal(malformedFrontmatter.code, 0, malformedFrontmatter.output);
    assert.match(malformedFrontmatter.output, /Would create docs\/decisions\/0083-/);
  });
});

test("freezes the permissive legacy decoding and document-size baseline", async () => {
  await withFixture(async (fixtureRoot) => {
    const legacyDocument = Buffer.concat([
      Buffer.from(
        "\uFEFF---\r\nid: legacy.large-document\r\ntype: feature\r\nstatus: proposed\r\nowner: architecture/tooling\r\nsummary: Legacy characterization document with unusual source bytes.\r\n---\r\n\r\n# Legacy\r\n\r\n",
      ),
      Buffer.alloc(1_048_577, "x"),
      Buffer.from([0, 255, 10]),
    ]);
    await writeFile(path.join(fixtureRoot, "docs/legacy-large.md"), legacyDocument);
    const result = await runCreator(fixtureRoot, [
      ...adrArguments,
      "--dry-run",
    ]);
    assert.equal(result.code, 0, result.output);
  });
});
