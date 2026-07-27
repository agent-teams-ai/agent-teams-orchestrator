import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
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
    profiles: [{ id: "local" }, { id: "hosted" }],
    metricAttributes: [
      {
        cardinality: "low",
        id: "deployment.profile",
        maxDistinct: 2,
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
  assert.equal(result.catalog.indicators.length, 4);
  assert.equal(result.catalog.invariants.length, 4);
  assert.equal(result.catalog.resourceBudgets.length, 4);
});

test("rejects a high-cardinality metric attribute", () => {
  const catalog = minimalCatalog();
  catalog.indicators.push({
    allowedAttributes: ["tenant.id"],
    id: "orchestrator.invalid-cardinality",
    owner: "platform/control-api",
    profiles: ["local"],
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
    profiles: ["hosted"],
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
    profiles: ["hosted"],
    status: "active",
  });

  assert.match(
    validateReliabilitySemantics(catalog, owners).join("\n"),
    /REL-SLO-003/u,
  );
});
