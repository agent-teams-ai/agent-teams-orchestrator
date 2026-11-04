import assert from "node:assert/strict";
import test from "node:test";
import { Client, Pool } from "pg";
import { SandboxManifestError } from "../../../dist/features/sandbox-manifest/application/api.js";
import { createPostgresManifestStore } from "../../../dist/features/sandbox-manifest/adapters/outbound/persistence/postgres-manifest-store.js";
import { createSandboxManifestFeature } from "../../../dist/features/sandbox-manifest/composition/feature-module-factory.js";

type ReleaseMode = "healthy" | "socket-error" | "release-throws";

function checkedOut(mode: ReleaseMode) {
  const releases: (boolean | undefined)[] = [];
  const sql: string[] = [];
  // Use real pg/EventEmitter objects. Only their test network/custody methods
  // are replaced; no unsafe type assertions or actual socket are needed.
  const client = new Client();
  Object.defineProperty(client, "query", {
    value: async (command: string) => {
      sql.push(command);
      return { rows: [], rowCount: 0 };
    },
  });
  Object.defineProperty(client, "release", {
    value: (discard?: boolean) => {
      releases.push(discard);
      assert.equal(client.listenerCount("error"), 1, "error guard must remain installed during release");
      if (mode === "socket-error") {
        client.emit("error", new Error("TEST socket error during release"));
      }
      if (mode === "release-throws") throw new Error("TEST private release failure");
    },
  });
  const pool = new Pool({ max: 1 });
  Object.defineProperty(pool, "connect", { value: async () => client });
  return { pool, client, releases, sql };
}

const context = {
  tenantId: "TEST_tenant",
  projectId: "tenants/TEST_tenant/projects/TEST_project",
  principalId: "TEST_principal",
};
function migration(pool: Pool) {
  return createSandboxManifestFeature({
    pool,
    migrationPool: pool,
    authorization: { assertAuthorized: async () => {} },
  }).migrate();
}
function read(pool: Pool) {
  return createPostgresManifestStore(pool, () => "TEST_event").read(
    context,
    `${context.projectId}/contextManifests/TEST_missing`,
  );
}

for (const [name, operation] of [
  ["manifest read", read],
  ["manifest migration", migration],
] as const) {
  test(`${name}: checked-out release retains the error listener until custody transfers`, async () => {
    const fixture = checkedOut("healthy");
    await operation(fixture.pool);
    assert.deepEqual(fixture.releases, [false]);
    assert.equal(fixture.client.listenerCount("error"), 0, "successful release removes only its guard");
    assert.ok(fixture.sql.includes("COMMIT"));
  });

  test(`${name}: socket error during release returns UNAVAILABLE rather than a false success`, async () => {
    const fixture = checkedOut("socket-error");
    await assert.rejects(operation(fixture.pool), (error: unknown) =>
      error instanceof SandboxManifestError && error.code === "UNAVAILABLE");
    assert.deepEqual(fixture.releases, [false]);
    assert.equal(fixture.client.listenerCount("error"), 0, "ownership transferred before listener removal");
    assert.ok(fixture.sql.includes("COMMIT"), "the post-commit outcome remains uncertain");
  });

  test(`${name}: throwing release keeps a nonthrowing error guard for uncertain custody`, async () => {
    const fixture = checkedOut("release-throws");
    await assert.rejects(operation(fixture.pool), (error: unknown) =>
      error instanceof SandboxManifestError && error.code === "UNAVAILABLE");
    assert.deepEqual(fixture.releases, [false]);
    assert.equal(fixture.client.listenerCount("error"), 1, "unproven ownership transfer retains guard");
    assert.doesNotThrow(() => {
      fixture.client.emit("error", new Error("TEST late socket failure"));
    });
  });
}
