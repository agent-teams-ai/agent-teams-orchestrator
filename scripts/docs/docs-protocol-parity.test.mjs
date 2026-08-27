import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  docsCheck,
  docsDoctor,
  docsNew,
  docsRecover,
} from "@agent-teams/docs-protocol";

const qualificationModule = await import(
  process.env.DOCS_PROTOCOL_QUALIFICATION_MODULE ??
    "@agent-teams/docs-protocol/qualification"
);

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const docsPackageRoot = path.dirname(fileURLToPath(import.meta.resolve("@agent-teams/docs-protocol/package.json")));
const foundationPackageRoot = path.dirname(fileURLToPath(import.meta.resolve("@agent-teams/engineering-foundation/package.json")));
const { version: docsPackageVersion } = JSON.parse(await readFile(path.join(docsPackageRoot, "package.json"), "utf8"));
const { version: foundationPackageVersion } = JSON.parse(await readFile(path.join(foundationPackageRoot, "package.json"), "utf8"));

test("v2 qualification contract binds the managed integration gate and covers each live type once", async () => {
  const [qualification, integration, rollout] = await Promise.all([
    readFile(path.join(repositoryRoot, "architecture/foundation/docs-protocol-qualification.json"), "utf8").then(JSON.parse),
    readFile(path.join(repositoryRoot, "architecture/foundation/docs-consumer-integration.json"), "utf8").then(JSON.parse),
    readFile(path.join(repositoryRoot, "architecture/foundation/docs-protocol-rollout.yaml"), "utf8"),
  ]);
  assert.deepEqual(Object.keys(qualification).toSorted(), ["scenarios", "schemaVersion"]);
  assert.equal(qualification.schemaVersion, 2);
  assert.equal(integration.schemaVersion, 1);
  assert.match(rollout, /^status: stable3-current-v2-staged$/mu);
  assert.match(rollout, /^  integrationSchemaVersion: 2$/mu);
  assert.match(rollout, /^  qualificationContractSchemaVersion: 2$/mu);
  assert.deepEqual(
    qualification.scenarios.map(({ type }) => type).toSorted(),
    ["adr", "bounded-context", "contract", "feature", "open-decision", "runbook"],
  );
  assert.equal(new Set(qualification.scenarios.map(({ id }) => id)).size, 6);
  assert.ok(qualification.scenarios.every(({ expected }) => expected.metadataStorage === "frontmatter"));
});

const cases = [
  {
    name: "adr",
    expectedPath: "docs/decisions/9001-frozen-adr.md",
    indexPath: "docs/decisions/README.md",
    intent: { type: "adr", id: "ADR-9001", title: "Frozen ADR", owner: "architecture/tooling", summary: "Freezes the unified ADR document creation contract." },
  },
  {
    name: "open-decision",
    expectedPath: "docs/open-decisions/OD-901-frozen-choice.md",
    indexPath: "docs/open-decisions/README.md",
    intent: { type: "open-decision", id: "OD-901", title: "Frozen Choice", owner: "architecture/tooling", summary: "Freezes the unified open decision creation contract." },
  },
  {
    name: "bounded-context",
    expectedPath: "docs/domain/contexts/frozen/README.md",
    indexPath: "docs/domain/contexts/README.md",
    intent: { type: "bounded-context", id: "domain.contexts.frozen", title: "Frozen Context", owner: "architecture/tooling", summary: "Freezes the unified bounded context creation contract." },
  },
  {
    name: "contract",
    expectedPath: "docs/contracts/frozen-widgets-v1.md",
    indexPath: "docs/README.md",
    intent: { type: "contract", id: "contract.frozen.widgets.v1", title: "Frozen Widgets v1", owner: "architecture/tooling", summary: "Freezes the unified contract document creation behavior." },
  },
  {
    name: "feature",
    expectedPath: "packages/example/src/features/create-widget/README.md",
    indexPath: "packages/example/README.md",
    intent: { type: "feature", id: "feature.example.create-widget", title: "Create Widget", owner: "architecture/tooling", summary: "Freezes the unified feature document creation behavior.", destination: "packages/example/src/features/create-widget/README.md" },
    related: ["ADR-0001"],
    blockedBy: ["OD-001"],
    codeAnchors: [{ pattern: "packages/example/src/features/create-widget/*.ts", enforcement: "required" }],
  },
  {
    name: "runbook",
    expectedPath: "docs/operations/frozen-widget-outage.md",
    indexPath: "docs/README.md",
    intent: { type: "runbook", id: "runbook.frozen.widget-outage", title: "Frozen Widget Outage", owner: "architecture/tooling", summary: "Freezes the unified runbook document creation behavior." },
  },
];

function indexSource(id, title) {
  return `---\nid: ${id}\ntype: index\nstatus: active\nowner: architecture/tooling\nsummary: Fixture index for unified documentation protocol parity tests.\n---\n\n# ${title}\n`;
}

async function makeSourceFixture({ installPackages = true } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "atd-o-"));
  await Promise.all([
    mkdir(path.join(root, "architecture/foundation"), { recursive: true }),
    mkdir(path.join(root, "apps"), { recursive: true }),
    mkdir(path.join(root, ".agents/skills/docs-authoring"), { recursive: true }),
    mkdir(path.join(root, "docs/decisions"), { recursive: true }),
    mkdir(path.join(root, "docs/open-decisions"), { recursive: true }),
    mkdir(path.join(root, "docs/domain/contexts"), { recursive: true }),
    mkdir(path.join(root, "docs/contracts"), { recursive: true }),
    mkdir(path.join(root, "docs/operations"), { recursive: true }),
    mkdir(path.join(root, "packages/example/src/features/create-widget"), { recursive: true }),
    mkdir(path.join(root, "tooling"), { recursive: true }),
    ...(installPackages ? [mkdir(path.join(root, "node_modules/@agent-teams"), { recursive: true })] : []),
  ]);
  await Promise.all([
    cp(path.join(repositoryRoot, "architecture/foundation/document-authoring.yaml"), path.join(root, "architecture/foundation/document-authoring.yaml")),
    cp(path.join(repositoryRoot, "architecture/foundation/docs-protocol.yaml"), path.join(root, "architecture/foundation/docs-protocol.yaml")),
    cp(path.join(repositoryRoot, ".agents/skills/docs-authoring/SKILL.md"), path.join(root, ".agents/skills/docs-authoring/SKILL.md")),
    cp(path.join(repositoryRoot, "AGENTS.md"), path.join(root, "AGENTS.md")),
    cp(path.join(repositoryRoot, "docs/templates"), path.join(root, "docs/templates"), { recursive: true }),
    cp(path.join(repositoryRoot, "docs/metadata.schema.json"), path.join(root, "docs/metadata.schema.json")),
    cp(path.join(repositoryRoot, "docs/owners.yaml"), path.join(root, "docs/owners.yaml")),
    writeFile(path.join(root, "package.json"), `${JSON.stringify({ name: "docs-parity-fixture", private: true, type: "module", scripts: Object.fromEntries(["check", "doctor", "find", "info", "new", "recover"].map((command) => [`docs:${command}`, `agent-teams-docs ${command} --consumer . --profile architecture/foundation/docs-protocol.yaml`])), devDependencies: { "@agent-teams/docs-protocol": docsPackageVersion, "@agent-teams/engineering-foundation": foundationPackageVersion } }, null, 2)}\n`),
    writeFile(path.join(root, "docs/README.md"), indexSource("docs.index", "Documentation")),
    writeFile(path.join(root, "docs/decisions/README.md"), indexSource("docs.decisions.index", "Decisions")),
    writeFile(path.join(root, "docs/open-decisions/README.md"), indexSource("docs.open-decisions.index", "Open Decisions")),
    writeFile(path.join(root, "docs/domain/contexts/README.md"), indexSource("docs.domain.contexts.index", "Contexts")),
    writeFile(path.join(root, "docs/contracts/README.md"), indexSource("docs.contracts.index", "Contracts")),
    writeFile(path.join(root, "docs/operations/README.md"), indexSource("docs.operations.index", "Operations")),
    writeFile(path.join(root, "packages/example/README.md"), indexSource("package.example.index", "Example Package")),
    writeFile(path.join(root, "packages/example/src/features/create-widget/create-widget.ts"), "export {};\n"),
    cp(path.join(repositoryRoot, "docs/decisions/0001-headless-event-driven-modular-monolith.md"), path.join(root, "docs/decisions/0001-frozen.md")),
    writeFile(path.join(root, "docs/open-decisions/OD-001-frozen.md"), "---\nid: OD-001\ntype: open-decision\nstatus: open\nowner: architecture/tooling\nsummary: Existing decision used by protocol blocker parity.\n---\n\n# OD-001: Existing Open Decision\n"),
    ...(installPackages ? [
      symlink(docsPackageRoot, path.join(root, "node_modules/@agent-teams/docs-protocol"), process.platform === "win32" ? "junction" : "dir"),
      symlink(foundationPackageRoot, path.join(root, "node_modules/@agent-teams/engineering-foundation"), process.platform === "win32" ? "junction" : "dir"),
    ] : []),
  ]);
  return root;
}

const requiresStrictDirectoryDurability = process.platform === "win32" ? test.skip : test;
const requiresUnsupportedStrictDirectoryDurability = process.platform === "win32" ? test : test.skip;

for (const scenario of cases) {
  requiresStrictDirectoryDurability(`shared writer freezes exact ${scenario.name} bytes, path, heading, template, and index instruction`, async () => {
    const source = await makeSourceFixture();
    try {
      const preflight = await docsCheck({ consumerRoot: source, profilePath: "architecture/foundation/docs-protocol.yaml" });
      assert.equal(preflight.exitCode, 0, JSON.stringify(preflight.envelope));
      const result = await docsNew({
        consumerRoot: source,
        profilePath: "architecture/foundation/docs-protocol.yaml",
        apply: true,
        intent: scenario.intent,
        related: scenario.related,
        blockedBy: scenario.blockedBy,
        codeAnchors: scenario.codeAnchors,
      });
      assert.equal(result.exitCode, 0, JSON.stringify(result.envelope));
      assert.equal(result.envelope.result.documentPath, scenario.expectedPath);
      assert.deepEqual(result.envelope.result.reachability, {
        state: "manual-required",
        indexPath: scenario.indexPath,
        markdownLink: `[${scenario.name === "adr" ? "ADR-9001: Frozen ADR" : scenario.name === "open-decision" ? "OD-901: Frozen Choice" : scenario.intent.title}](${path.posix.relative(path.posix.dirname(scenario.indexPath), scenario.expectedPath)})`,
      });
      const actual = await readFile(path.join(source, scenario.expectedPath), "utf8");
      const expected = await readFile(path.join(repositoryRoot, "scripts/docs/fixtures/docs-protocol-golden", `${scenario.name}.md`), "utf8");
      assert.equal(actual, expected);
    } finally {
      await rm(source, { recursive: true, force: true });
    }
  });
}

const qualificationV2Test =
  process.platform === "win32" ||
  typeof qualificationModule.runDocsProtocolQualificationV2 !== "function"
    ? test.skip
    : test;

qualificationV2Test("managed v2 runner qualifies every live type on one disposable consumer copy", async () => {
  const localDevelopment =
    process.env.DOCS_PROTOCOL_QUALIFICATION_LOCAL_DEVELOPMENT === "1";
  const sourceFiles = [
    "architecture/foundation/docs-consumer-integration.json",
    "architecture/foundation/docs-protocol-qualification.json",
    ".agents/skills/docs-authoring/SKILL.md",
  ];
  const before = await Promise.all(
    sourceFiles.map((file) => readFile(path.join(repositoryRoot, file))),
  );
  const receipt = await qualificationModule.runDocsProtocolQualificationV2({
    consumerRoot: repositoryRoot,
    ...(localDevelopment ? { localDevelopment: true } : {}),
  });

  assert.equal(receipt.schemaVersion, 2);
  assert.equal(receipt.projectId, "agent-teams-orchestrator");
  assert.equal(receipt.cohortAdmissible, !localDevelopment);
  assert.equal(
    receipt.evidenceClass,
    localDevelopment ? "local-development" : "released-cohort",
  );
  assert.deepEqual(receipt.scenarios.map(({ type }) => type).toSorted(), [
    "adr",
    "bounded-context",
    "contract",
    "feature",
    "open-decision",
    "runbook",
  ]);
  assert.deepEqual(receipt.checks, [
    "info",
    "find",
    "check",
    "doctor",
    "recover",
    "preview",
    "apply",
    "path",
    "reachability",
    "golden",
    "source-unchanged",
  ]);
  assert.deepEqual(
    await Promise.all(sourceFiles.map((file) => readFile(path.join(repositoryRoot, file)))),
    before,
  );
});

const strictReleaseQualificationTest =
  qualificationV2Test === test &&
  process.env.DOCS_PROTOCOL_QUALIFICATION_LOCAL_DEVELOPMENT === "1"
    ? test
    : test.skip;

strictReleaseQualificationTest("unreleased local packages remain blocked from cohort-admissible qualification by default", async () => {
  const source = await readFile(
    path.join(repositoryRoot, ".agents/skills/docs-authoring/SKILL.md"),
  );
  await assert.rejects(
    qualificationModule.runDocsProtocolQualificationV2({
      consumerRoot: repositoryRoot,
    }),
    /qualification check failed/u,
  );
  assert.deepEqual(
    await readFile(path.join(repositoryRoot, ".agents/skills/docs-authoring/SKILL.md")),
    source,
  );
});

requiresUnsupportedStrictDirectoryDurability("Windows previews all six types and preserves fail-closed durability evidence", async () => {
  const source = await makeSourceFixture();
  try {
    const preflight = await docsCheck({ consumerRoot: source, profilePath: "architecture/foundation/docs-protocol.yaml" });
    assert.equal(preflight.exitCode, 0, JSON.stringify(preflight.envelope));
    for (const scenario of cases) {
      const preview = await docsNew({
        consumerRoot: source,
        profilePath: "architecture/foundation/docs-protocol.yaml",
        apply: false,
        intent: scenario.intent,
        related: scenario.related,
        blockedBy: scenario.blockedBy,
        codeAnchors: scenario.codeAnchors,
      });
      assert.equal(preview.exitCode, 0, JSON.stringify(preview.envelope));
      assert.equal(preview.envelope.result.writeState, "preview");
      assert.equal(preview.envelope.result.documentPath, scenario.expectedPath);
      assert.equal(preview.envelope.result.reachability.indexPath, scenario.indexPath);
      await assert.rejects(readFile(path.join(source, scenario.expectedPath)), { code: "ENOENT" });
    }

    const applied = await docsNew({
      consumerRoot: source,
      profilePath: "architecture/foundation/docs-protocol.yaml",
      apply: true,
      intent: cases[0].intent,
    });
    assert.equal(applied.exitCode, 1);
    assert.equal(applied.envelope.outcome, "recovery-required");
    assert.equal(applied.envelope.result.writeState, "unchanged");
    assert.equal(applied.envelope.result.receiptOutcome, "manual-recovery-required");
    assert.ok(applied.envelope.diagnostics.some(({ ruleId }) => ruleId === "document.transaction.journal-reconciliation"));
    await assert.rejects(readFile(path.join(source, cases[0].expectedPath)), { code: "ENOENT" });

    const stateDirectory = path.join(source, ".agent-teams-local");
    const transitionName = "scaffolding-transaction.json.document-transition";
    assert.deepEqual((await readdir(stateDirectory)).toSorted(), [
      "foundation-operation.lock",
      transitionName,
    ]);
    const transitionBefore = await readFile(path.join(stateDirectory, transitionName));
    const doctor = await docsDoctor({ consumerRoot: source, profilePath: "architecture/foundation/docs-protocol.yaml" });
    const recovered = await docsRecover({ consumerRoot: source, profilePath: "architecture/foundation/docs-protocol.yaml" });
    assert.equal(doctor.exitCode, 1);
    assert.equal(doctor.envelope.result.environment.filesystem.strictDirectoryDurability, "platform-unsupported");
    assert.equal(doctor.envelope.result.transaction.state, "manual-recovery-required");
    assert.equal(recovered.exitCode, 1);
    assert.equal(recovered.envelope.result.transactionState, "manual-required");
    assert.equal(recovered.envelope.result.transaction.state, "manual-recovery-required");
    assert.deepEqual(await readFile(path.join(stateDirectory, transitionName)), transitionBefore);
  } finally {
    await rm(source, { recursive: true, force: true });
  }
});

test("shared writer rejects unknown owners and unresolved relation IDs without mutation", async () => {
  const source = await makeSourceFixture();
  try {
    for (const request of [
      { ...cases[0], intent: { ...cases[0].intent, id: "ADR-9002", owner: "not/registered" } },
      { ...cases[4], intent: { ...cases[4].intent, id: "feature.example.missing-relation" }, related: ["ADR-9999"], blockedBy: [] },
    ]) {
      await assert.rejects(
        docsNew({ consumerRoot: source, profilePath: "architecture/foundation/docs-protocol.yaml", apply: true, intent: request.intent, related: request.related, blockedBy: request.blockedBy, codeAnchors: request.codeAnchors }),
        /not allowed|does not exist/u,
      );
      await assert.rejects(readFile(path.join(source, request.expectedPath)), { code: "ENOENT" });
    }
  } finally {
    await rm(source, { recursive: true, force: true });
  }
});
