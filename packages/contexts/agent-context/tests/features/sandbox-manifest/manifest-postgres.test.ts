import assert from "node:assert/strict";
import test from "node:test";
import { createSandboxManifestFeature } from "../../../dist/index.js";
import { ownedPostgres } from "./pg-fixture.ts";
const enabled = process.env.RUN_CONTEXT_OBSERVATION_PG === "1";
test(
  "immutable manifests survive PostgreSQL restart, reject path authority and enforce forced RLS/current authorization",
  { skip: !enabled, timeout: 90000 },
  async () => {
    const cluster = await ownedPostgres();
    let pools = { owner: cluster.owner, runtime: cluster.runtime };
    let denied = false;
    const context = {
      tenantId: "TEST_tenant",
      projectId: "tenants/TEST_tenant/projects/TEST_project",
      principalId: "TEST_human",
    };
    const authorization = {
      async assertAuthorized() {
        if (denied) {
          throw new Error("TEST revoked");
        }
      },
    };
    const make = (pool = pools.runtime) =>
      createSandboxManifestFeature({ pool, migrationPool: pools.owner, authorization });
    let feature = make();
    const manifest = {
      name: `${context.projectId}/contextManifests/manifest`,
      workspace: `${context.projectId}/workspaces/workspace`,
      agentProfileVersion: `${context.projectId}/agentProfileVersions/profile`,
      runPolicySnapshot: `${context.projectId}/runPolicySnapshots/policy`,
      instructionRef: "instructions:version-1",
      createdAt: "-1",
    };
    try {
      await feature.migrate();
      await pools.owner.query("GRANT USAGE ON SCHEMA agent_context TO test_runtime");
      await pools.owner.query(
        "GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA agent_context TO test_runtime",
      );
      await Promise.all([
        feature.seedManifest(context, manifest),
        feature.seedManifest(context, { ...manifest }),
      ]);
      assert.deepEqual(await feature.api.getManifest(context, { name: manifest.name }), manifest);
      assert.equal(
        (await pools.owner.query("SELECT count(*)::text AS count FROM agent_context.outbox"))
          .rows[0].count,
        "1",
      );
      assert.equal(
        (
          await pools.owner.query(
            "SELECT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS.US') AS instant FROM agent_context.manifests",
          )
        ).rows[0].instant,
        "1969-12-31 23:59:59.999999",
      );
      await assert.rejects(
        () => feature.seedManifest(context, { ...manifest, instructionRef: "other-version" }),
        { code: "CONFLICT" },
      );
      await assert.rejects(
        () => feature.seedManifest(context, { ...manifest, workspace: "/real/user/project" }),
        { code: "INVALID_ARGUMENT" },
      );
      await assert.rejects(
        () => feature.seedManifest(context, { ...manifest, instructionRef: undefined } as never),
        { code: "INVALID_ARGUMENT" },
      );
      await assert.rejects(
        () =>
          feature.seedManifest(context, {
            ...manifest,
            rawPrompt: "must never become manifest content",
          } as never),
        { code: "INVALID_ARGUMENT" },
      );
      denied = true;
      await assert.rejects(
        () => feature.api.getManifest(context, { name: manifest.name }),
        /TEST revoked/,
      );
      denied = false;
      const foreign = {
        tenantId: "foreign",
        projectId: "tenants/foreign/projects/project",
        principalId: "TEST_human",
      };
      await assert.rejects(() => feature.api.getManifest(foreign, { name: manifest.name }), {
        code: "INVALID_ARGUMENT",
      });
      const client = await pools.runtime.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT set_config('app.tenant_id','foreign',true)");
        assert.equal((await client.query("SELECT * FROM agent_context.manifests")).rowCount, 0);
        await client.query("ROLLBACK");
      } finally {
        client.release();
      }
      pools = await cluster.restart();
      feature = make();
      assert.deepEqual(await feature.api.getManifest(context, { name: manifest.name }), manifest);
      await feature.seedManifest(context, manifest);
      assert.equal(
        (await pools.owner.query("SELECT count(*)::text AS count FROM agent_context.outbox"))
          .rows[0].count,
        "1",
      );
      let loseCommit = true;
      const lostResponsePool = new Proxy(pools.runtime, {
        get(target, key) {
          if (key !== "connect") {
            return Reflect.get(target, key);
          }
          return async () => {
            const borrowed = await target.connect();
            return new Proxy(borrowed, {
              get(connection, property) {
                if (property === "release") {
                  return connection.release.bind(connection);
                }
                if (property !== "query") {
                  return Reflect.get(connection, property);
                }
                return async (text: string, values?: unknown[]) => {
                  const result = await connection.query(text, values);
                  if (text === "COMMIT" && loseCommit) {
                    loseCommit = false;
                    throw new Error("TEST committed response lost");
                  }
                  return result;
                };
              },
            });
          };
        },
      });
      const committed = {
        ...manifest,
        name: `${context.projectId}/contextManifests/lost-response`,
      };
      await assert.rejects(() => make(lostResponsePool).seedManifest(context, committed), {
        code: "UNAVAILABLE",
      });
      await feature.seedManifest(context, committed);
      assert.deepEqual(await feature.api.getManifest(context, { name: committed.name }), committed);
      assert.equal(
        (await pools.owner.query("SELECT count(*)::text AS count FROM agent_context.outbox"))
          .rows[0].count,
        "2",
      );
      await pools.owner.query(
        "CREATE FUNCTION agent_context.test_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST rollback'; END $$",
      );
      await pools.owner.query(
        "CREATE TRIGGER test_rollback BEFORE INSERT ON agent_context.outbox FOR EACH ROW EXECUTE FUNCTION agent_context.test_reject()",
      );
      const next = { ...manifest, name: `${context.projectId}/contextManifests/failure` };
      await assert.rejects(() => feature.seedManifest(context, next), { code: "UNAVAILABLE" });
      await assert.rejects(() => feature.api.getManifest(context, { name: next.name }), {
        code: "NOT_FOUND",
      });
    } finally {
      await cluster.stop([pools.owner, pools.runtime]);
    }
  },
);
