import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  validateQualificationReferences,
  validateReliabilityFoundation,
  validateReliabilitySemantics,
} from "./validate-reliability-foundation.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const owners = new Set([
  "access-control",
  "architecture/reliability",
  "platform/control-api",
  "platform/eventing",
  "platform/local-host",
  "platform/observability",
  "platform/persistence",
  "run-orchestration",
]);

function minimalCatalog() {
  return {
    qualificationFramework: {
      blockedBy: ["OD-039"],
      id: "deployment-qualification",
      qualification: "blocked",
      qualificationEvidence: { conformanceRefs: [], decisionRefs: [] },
    },
    profiles: [
      {
        blockedBy: ["OD-003", "OD-012"],
        commercialAuthorityAdapter: "optional-managed-platform",
        id: "managed-saas",
        productAuthorityAdapter: "managed-platform",
        qualification: "blocked",
        qualificationEvidence: { conformanceRefs: [], decisionRefs: [] },
        releaseScope: "v1-target",
        requiredCapabilities: ["server-runtime-execution"],
      },
      {
        blockedBy: ["OD-003", "OD-012"],
        commercialAuthorityAdapter: "none",
        id: "standalone-self-hosted",
        productAuthorityAdapter: "standalone",
        qualification: "blocked",
        qualificationEvidence: { conformanceRefs: [], decisionRefs: [] },
        releaseScope: "v1-target",
        requiredCapabilities: ["server-runtime-execution"],
      },
      {
        blockedBy: ["OD-003", "OD-012"],
        commercialAuthorityAdapter: "optional-managed-platform",
        id: "connected-self-hosted",
        productAuthorityAdapter: "standalone",
        qualification: "deferred",
        qualificationEvidence: { conformanceRefs: [], decisionRefs: [] },
        releaseScope: "future",
        requiredCapabilities: ["server-runtime-execution"],
      },
      {
        blockedBy: ["OD-001", "OD-003", "OD-009", "OD-021", "OD-035"],
        commercialAuthorityAdapter: "none",
        id: "fully-local",
        productAuthorityAdapter: "local-standalone",
        qualification: "deferred",
        qualificationEvidence: { conformanceRefs: [], decisionRefs: [] },
        releaseScope: "future",
        requiredCapabilities: ["local-host-runtime-execution"],
      },
    ],
    capabilities: [
      {
        blockedBy: ["OD-004"],
        id: "server-runtime-execution",
        profiles: [
          "connected-self-hosted",
          "managed-saas",
          "standalone-self-hosted",
        ],
        qualification: "blocked",
        qualificationEvidence: { conformanceRefs: [], decisionRefs: [] },
      },
      {
        blockedBy: ["OD-004", "OD-021", "OD-035"],
        id: "local-host-runtime-execution",
        profiles: ["fully-local"],
        qualification: "blocked",
        qualificationEvidence: { conformanceRefs: [], decisionRefs: [] },
      },
      {
        blockedBy: ["OD-038"],
        id: "local-device-execution",
        profiles: [
          "connected-self-hosted",
          "managed-saas",
          "standalone-self-hosted",
        ],
        qualification: "blocked",
        qualificationEvidence: { conformanceRefs: [], decisionRefs: [] },
      },
      {
        blockedBy: ["OD-037"],
        id: "managed-commercial-entitlements",
        profiles: ["connected-self-hosted", "managed-saas"],
        qualification: "blocked",
        qualificationEvidence: { conformanceRefs: [], decisionRefs: [] },
      },
    ],
    metricAttributes: [
      {
        cardinality: "low",
        id: "deployment.profile",
        maxDistinct: 4,
      },
    ],
    prohibitedMetricAttributes: [
      "agent.id",
      "operation.id",
      "project.id",
      "run.id",
      "runtime.session.id",
      "span.id",
      "team.id",
      "tenant.id",
      "trace.id",
      "url.full",
      "url.path",
      "user.id",
      "workspace.path",
    ],
    indicators: [],
    invariants: [],
    resourceBudgets: [],
  };
}

test("accepts the canonical reliability foundation", async () => {
  const result = await validateReliabilityFoundation(repositoryRoot);
  assert.deepEqual(result.errors, []);
  assert.equal(result.catalog.indicators.length, 5);
  assert.equal(result.catalog.invariants.length, 5);
  assert.equal(result.catalog.resourceBudgets.length, 4);
});

test("returns schema diagnostics without running semantic validation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "reliability-schema-"));
  try {
    await Promise.all([
      mkdir(path.join(root, "architecture/reliability"), { recursive: true }),
      mkdir(path.join(root, "docs"), { recursive: true }),
    ]);
    await Promise.all([
      copyFile(
        path.join(
          repositoryRoot,
          "architecture/reliability/reliability-catalog.schema.json",
        ),
        path.join(
          root,
          "architecture/reliability/reliability-catalog.schema.json",
        ),
      ),
      writeFile(
        path.join(root, "architecture/reliability/reliability-catalog.yaml"),
        "schemaVersion: 1\n",
      ),
      writeFile(path.join(root, "docs/owners.yaml"), "owners: {}\n"),
    ]);

    const result = await validateReliabilityFoundation(root);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.every((error) => error.startsWith("REL-SCHEMA-001")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a high-cardinality metric attribute", () => {
  const catalog = minimalCatalog();
  catalog.indicators.push({
    allowedAttributes: ["tenant.id"],
    id: "orchestrator.invalid-cardinality",
    owner: "platform/control-api",
    profiles: ["fully-local"],
    status: "candidate",
  });

  assert.match(
    validateReliabilitySemantics(catalog, owners).join("\n"),
    /REL-CARDINALITY-001/u,
  );
});

test("rejects an active SLO without an approved objective", () => {
  const catalog = minimalCatalog();
  catalog.indicators.push({
    allowedAttributes: ["deployment.profile"],
    id: "orchestrator.unapproved-slo",
    owner: "platform/control-api",
    profiles: ["managed-saas"],
    status: "active",
  });

  assert.match(
    validateReliabilitySemantics(catalog, owners).join("\n"),
    /REL-SLO-001/u,
  );
});

test("rejects a 100 percent objective", () => {
  const catalog = minimalCatalog();
  catalog.indicators.push({
    allowedAttributes: ["deployment.profile"],
    id: "orchestrator.impossible-slo",
    objective: {
      approvedAt: "2026-07-27",
      reviewAfter: "2026-10-27",
      targetRatio: "1",
    },
    owner: "platform/control-api",
    profiles: ["standalone-self-hosted"],
    status: "active",
  });

  assert.match(
    validateReliabilitySemantics(catalog, owners).join("\n"),
    /REL-SLO-003/u,
  );
});

test("rejects a qualified profile that retains blockers", () => {
  const catalog = minimalCatalog();
  catalog.profiles[0].qualification = "qualified";

  assert.match(
    validateReliabilitySemantics(catalog, owners).join("\n"),
    /REL-PROFILE-004/u,
  );
});

test("rejects qualified state without decision and conformance evidence", () => {
  const catalog = minimalCatalog();
  catalog.profiles[0].blockedBy = [];
  catalog.profiles[0].qualification = "qualified";

  assert.match(
    validateReliabilitySemantics(catalog, owners).join("\n"),
    /REL-PROFILE-007/u,
  );
});

test("rejects qualification while the attestation framework is blocked", () => {
  const catalog = minimalCatalog();
  catalog.profiles[0].blockedBy = [];
  catalog.profiles[0].qualification = "qualified";
  catalog.profiles[0].qualificationEvidence = {
    conformanceRefs: ["architecture/qualification-evidence/managed.json"],
    decisionRefs: ["ADR-0093"],
  };

  assert.match(
    validateReliabilitySemantics(catalog, owners).join("\n"),
    /REL-PROFILE-018/u,
  );
});

test("rejects enabling the qualification framework before its verifier exists", () => {
  const catalog = minimalCatalog();
  catalog.qualificationFramework.blockedBy = [];
  catalog.qualificationFramework.qualification = "qualified";
  catalog.qualificationFramework.qualificationEvidence = {
    conformanceRefs: ["architecture/qualification-evidence/framework.json"],
    decisionRefs: ["ADR-0093"],
  };

  assert.match(
    validateReliabilitySemantics(catalog, owners).join("\n"),
    /REL-PROFILE-017/u,
  );
});

test("rejects rebinding the qualification framework away from OD-039", () => {
  const catalog = minimalCatalog();
  catalog.qualificationFramework.blockedBy = ["OD-003"];

  assert.match(
    validateReliabilitySemantics(catalog, owners).join("\n"),
    /REL-PROFILE-023/u,
  );
});

test("rejects deleting or rebinding a required deployment capability", () => {
  const catalog = minimalCatalog();
  catalog.capabilities = catalog.capabilities.filter(
    (capability) => capability.id !== "local-device-execution",
  );
  catalog.capabilities[0].profiles = ["managed-saas"];

  const output = validateReliabilitySemantics(catalog, owners).join("\n");
  assert.match(output, /REL-PROFILE-020/u);
  assert.match(output, /REL-PROFILE-021/u);
});

test("rejects deleting a deployment capability blocker", () => {
  const catalog = minimalCatalog();
  const localHostCapability = catalog.capabilities.find(
    (capability) => capability.id === "local-host-runtime-execution",
  );
  localHostCapability.blockedBy = ["OD-004"];

  assert.match(
    validateReliabilitySemantics(catalog, owners).join("\n"),
    /REL-PROFILE-020/u,
  );
});

test("rejects making optional commercial work a profile blocker", () => {
  const catalog = minimalCatalog();
  const connectedProfile = catalog.profiles.find(
    (profile) => profile.id === "connected-self-hosted",
  );
  connectedProfile.blockedBy.push("OD-037");

  assert.match(
    validateReliabilitySemantics(catalog, owners).join("\n"),
    /REL-PROFILE-008/u,
  );
});

test("rejects a qualified profile whose mandatory capability is not qualified", () => {
  const catalog = minimalCatalog();
  catalog.profiles[0].blockedBy = [];
  catalog.profiles[0].qualification = "qualified";
  catalog.profiles[0].qualificationEvidence = {
    conformanceRefs: ["architecture/qualification-evidence/managed.json"],
    decisionRefs: ["ADR-0093"],
  };

  assert.match(
    validateReliabilitySemantics(catalog, owners).join("\n"),
    /REL-PROFILE-022/u,
  );
});

test("rejects unknown blockers and missing conformance artifacts", async () => {
  const catalog = minimalCatalog();
  catalog.profiles[0].blockedBy = [];
  catalog.profiles[0].qualification = "qualified";
  catalog.profiles[0].qualificationEvidence = {
    conformanceRefs: [
      "architecture/qualification-evidence/missing-managed-saas.json",
    ],
    decisionRefs: ["ADR-0090"],
  };
  catalog.capabilities[0].blockedBy = ["OD-999"];

  const errors = await validateQualificationReferences(
    catalog,
    repositoryRoot,
  );
  assert.match(errors.join("\n"), /REL-PROFILE-011/u);
  assert.match(errors.join("\n"), /REL-PROFILE-016/u);
});
