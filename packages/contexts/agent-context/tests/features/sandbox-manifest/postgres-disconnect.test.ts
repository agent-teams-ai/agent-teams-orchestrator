import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";
import { join } from "node:path";
import { createSandboxManifestFeature } from "../../../dist/index.js";
import { ownedPostgres } from "./pg-fixture.ts";
import { terminateOwnedCheckout } from "./terminate-backend.ts";
const make = (pool: Pool, migrationPool: Pool) =>
  createSandboxManifestFeature({
    pool,
    migrationPool,
    authorization: { async assertAuthorized() {} },
  });
test(
  "Manifest transactions and migrations survive termination of their checked-out PostgreSQL backend",
  { skip: process.env.RUN_CONTEXT_OBSERVATION_PG !== "1", timeout: 90000 },
  async () => {
    const cluster = await ownedPostgres();
    const context = {
      tenantId: "TEST_tenant",
      projectId: "tenants/TEST_tenant/projects/TEST_project",
      principalId: "TEST_human",
    };
    const manifest = {
      name: `${context.projectId}/contextManifests/disconnect`,
      workspace: `${context.projectId}/workspaces/workspace`,
      agentProfileVersion: `${context.projectId}/agentProfileVersions/profile`,
      runPolicySnapshot: `${context.projectId}/runPolicySnapshots/policy`,
      instructionRef: "instructions:one",
      createdAt: "1",
    };
    try {
      const ended = new Pool({
        host: join(cluster.root, "socket"),
        user: "test_runtime",
        database: "postgres",
      });
      await ended.end();
      const unavailable = make(ended, cluster.owner);
      await assert.rejects(() => unavailable.seedManifest(context, manifest), {
        code: "UNAVAILABLE",
      });
      await assert.rejects(() => unavailable.api.getManifest(context, { name: manifest.name }), {
        code: "UNAVAILABLE",
      });
      await assert.rejects(() => make(cluster.runtime, ended).migrate(), { code: "UNAVAILABLE" });
      assert.equal(ended.totalCount, 0);
      const feature = make(cluster.runtime, cluster.owner);
      await feature.migrate();
      await cluster.owner.query("GRANT USAGE ON SCHEMA agent_context TO test_runtime");
      await cluster.owner.query(
        "GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA agent_context TO test_runtime",
      );
      await terminateOwnedCheckout(cluster.runtime, cluster.owner, (pool) =>
        make(pool, cluster.owner).seedManifest(context, manifest),
      );
      await assert.rejects(() => feature.api.getManifest(context, { name: manifest.name }), {
        code: "NOT_FOUND",
      });
      assert.equal(
        (await cluster.owner.query("SELECT count(*)::text AS count FROM agent_context.outbox"))
          .rows[0].count,
        "0",
      );
      await terminateOwnedCheckout(cluster.owner, cluster.owner, (migrationPool) =>
        make(cluster.runtime, migrationPool).migrate(),
      );
      await feature.seedManifest(context, manifest);
      assert.deepEqual(await feature.api.getManifest(context, { name: manifest.name }), manifest);
      assert.equal(
        (await cluster.owner.query("SELECT count(*)::text AS count FROM agent_context.outbox"))
          .rows[0].count,
        "1",
      );
    } finally {
      await cluster.stop([cluster.owner, cluster.runtime]);
    }
  },
);
