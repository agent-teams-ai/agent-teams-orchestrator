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
import { runDocsProtocolQualification } from "@agent-teams/docs-protocol/qualification";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const docsPackageRoot = path.dirname(fileURLToPath(import.meta.resolve("@agent-teams/docs-protocol/package.json")));
const foundationPackageRoot = path.dirname(fileURLToPath(import.meta.resolve("@agent-teams/engineering-foundation/package.json")));
const { version: docsPackageVersion } = JSON.parse(await readFile(path.join(docsPackageRoot, "package.json"), "utf8"));
const { version: foundationPackageVersion } = JSON.parse(await readFile(path.join(foundationPackageRoot, "package.json"), "utf8"));
const qualification = JSON.parse(
  await readFile(
    path.join(
      repositoryRoot,
      "architecture/foundation/docs-protocol-qualification.json",
    ),
    "utf8",
  ),
);

test("qualification contract freezes exactly six v2 authoring scenarios", () => {
  assert.deepEqual(Object.keys(qualification).toSorted(), [
    "scenarios",
    "schemaVersion",
  ]);
  assert.equal(qualification.schemaVersion, 2);
  assert.equal(qualification.scenarios.length, 6);
  assert.deepEqual(
    qualification.scenarios.map(({ type }) => type).toSorted(),
    ["adr", "bounded-context", "contract", "feature", "open-decision", "runbook"],
  );
});

const stableReachability = {
  contract: {
    state: "manual-required",
    indexPath: "docs/contracts/README.md",
    markdownLink: "[Frozen Widgets v1](frozen-widgets-v1.md)",
  },
  runbook: {
    state: "manual-required",
    indexPath: "docs/operations/README.md",
    markdownLink: "[Frozen Widget Outage](frozen-widget-outage.md)",
  },
};

const cases = qualification.scenarios.map(({ id: name, type, intent, expected }) => ({
  name,
  intent: {
    type,
    id: intent.id,
    title: intent.title,
    owner: intent.owner,
    summary: intent.summary,
    ...(intent.slug === undefined ? {} : { slug: intent.slug }),
    ...(intent.destination === undefined
      ? {}
      : { destination: intent.destination }),
  },
  related: intent.related,
  blockedBy: intent.blockedBy,
  codeAnchors: intent.codeAnchors,
  additionalMetadata: intent.metadata,
  expectedPath: expected.documentPath,
  expectedReachability: stableReachability[name] ?? expected.reachability,
  goldenFile: expected.goldenFile,
}));

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
    mkdir(path.join(root, "packages/platform/local-host-control/src/features/host-discovery"), { recursive: true }),
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
    writeFile(path.join(root, "packages/platform/local-host-control/README.md"), indexSource("package.local-host-control.index", "Local Host Control")),
    writeFile(path.join(root, "packages/platform/local-host-control/src/features/host-discovery/index.ts"), "export {};\n"),
    cp(path.join(repositoryRoot, "docs/decisions/0001-headless-event-driven-modular-monolith.md"), path.join(root, "docs/decisions/0001-frozen.md")),
    writeFile(path.join(root, "docs/open-decisions/OD-001-frozen.md"), "---\nid: OD-001\ntype: open-decision\nstatus: open\nowner: architecture/tooling\nsummary: Existing decision used by protocol blocker parity.\n---\n\n# OD-001: Existing Open Decision\n"),
    ...(installPackages ? [
      symlink(docsPackageRoot, path.join(root, "node_modules/@agent-teams/docs-protocol"), process.platform === "win32" ? "junction" : "dir"),
      symlink(foundationPackageRoot, path.join(root, "node_modules/@agent-teams/engineering-foundation"), process.platform === "win32" ? "junction" : "dir"),
    ] : []),
  ]);
  return root;
}

async function replaceFixtureText(root, repositoryPath, before, after) {
  const filePath = path.join(root, repositoryPath);
  const source = await readFile(filePath, "utf8");
  assert.ok(source.includes(before), `${repositoryPath} lacks fixture text`);
  await writeFile(filePath, source.replace(before, after));
}

test("shared check owns metadata, owner membership, and duplicate IDs", async () => {
  const evidence = [
    {
      ruleId: "document.catalog.metadata-invalid",
      mutate: (source) =>
        replaceFixtureText(
          source,
          "docs/README.md",
          "summary: Fixture index for unified documentation protocol parity tests.",
          "summary: short",
        ),
    },
    {
      ruleId: "document.catalog.owner-unknown",
      mutate: (source) =>
        replaceFixtureText(
          source,
          "docs/README.md",
          "owner: architecture/tooling",
          "owner: not/registered",
        ),
    },
    {
      ruleId: "document.catalog.duplicate-id",
      mutate: (source) =>
        cp(
          path.join(source, "docs/decisions/0001-frozen.md"),
          path.join(source, "docs/decisions/0002-duplicate.md"),
        ),
    },
  ];

  for (const scenario of evidence) {
    const source = await makeSourceFixture();
    try {
      await scenario.mutate(source);
      const result = await docsCheck({
        consumerRoot: source,
        profilePath: "architecture/foundation/docs-protocol.yaml",
      });
      assert.equal(result.exitCode, 1, JSON.stringify(result.envelope));
      assert.ok(
        result.envelope.diagnostics.some(
          ({ ruleId }) => ruleId === scenario.ruleId,
        ),
        JSON.stringify(result.envelope),
      );
    } finally {
      await rm(source, { recursive: true, force: true });
    }
  }
});

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
        additionalMetadata: scenario.additionalMetadata,
      });
      assert.equal(result.exitCode, 0, JSON.stringify(result.envelope));
      assert.equal(result.envelope.result.documentPath, scenario.expectedPath);
      assert.deepEqual(
        result.envelope.result.reachability,
        scenario.expectedReachability,
      );
      const actual = await readFile(path.join(source, scenario.expectedPath), "utf8");
      const expected = await readFile(
        path.join(repositoryRoot, scenario.goldenFile),
        "utf8",
      );
      assert.equal(actual, expected);
    } finally {
      await rm(source, { recursive: true, force: true });
    }
  });
}

requiresStrictDirectoryDurability("shared qualification runner proves all six types on owned disposable copies", async () => {
  const source = await makeSourceFixture({ installPackages: false });
  try {
    for (const scenario of cases) {
      const receipt = await runDocsProtocolQualification({
        fixtureRoot: source,
        scenario: {
          find: { query: { id: "ADR-0001" }, expectedIds: ["ADR-0001"] },
          newDocument: {
            intent: scenario.intent,
            related: scenario.related,
            blockedBy: scenario.blockedBy,
            codeAnchors: scenario.codeAnchors,
            additionalMetadata: scenario.additionalMetadata,
          },
        },
      });
      assert.equal(receipt.projectId, "agent-teams-orchestrator");
      assert.equal(receipt.appliedDocumentPath, scenario.expectedPath);
      assert.deepEqual(receipt.checks, ["info", "find", "preview", "crash", "doctor", "recover", "receipt", "parent", "apply", "index", "check", "source-unchanged"]);
    }
  } finally {
    await rm(source, { recursive: true, force: true });
  }
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
        additionalMetadata: scenario.additionalMetadata,
      });
      assert.equal(preview.exitCode, 0, JSON.stringify(preview.envelope));
      assert.equal(preview.envelope.result.writeState, "preview");
      assert.equal(preview.envelope.result.documentPath, scenario.expectedPath);
      assert.deepEqual(
        preview.envelope.result.reachability,
        scenario.expectedReachability,
      );
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
