import { SandboxManifestError } from "../application/api.js";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type {
  ManifestRequestContext,
  SandboxManifest,
  SandboxManifestApi,
} from "../application/api.js";
import type { ManifestAuthorization } from "../application/ports/manifest-store.js";
import { createManifestRegistration } from "../application/register-sandbox-manifest.js";
import { createManifestApi } from "../application/create-manifest-api.js";
import { createPostgresManifestStore } from "../adapters/outbound/persistence/postgres-manifest-store.js";
import { sandboxManifestMigration } from "../adapters/outbound/persistence/migrations/0001-sandbox-manifest.js";
export interface SandboxManifestOptions {
  readonly pool: Pool;
  readonly migrationPool: Pool;
  readonly authorization: ManifestAuthorization;
  readonly nextId?: () => string;
}
export interface SandboxManifestFeature {
  readonly api: SandboxManifestApi;
  migrate(): Promise<void>;
  /** Host-only sandbox bootstrap: exact immutable registered references, never public mutation. */
  seedManifest(context: ManifestRequestContext, manifest: SandboxManifest): Promise<void>;
}
export function createSandboxManifestFeature(
  options: SandboxManifestOptions,
): SandboxManifestFeature {
  const store = createPostgresManifestStore(options.pool, options.nextId ?? randomUUID);
  return Object.freeze({
    api: createManifestApi({ store, authorization: options.authorization }),
    async migrate() {
      const client = await options.migrationPool.connect().catch(() => {
        throw new SandboxManifestError(
          "UNAVAILABLE",
          "Migration requires same-identity reconciliation",
        );
      });
      const health = { broken: false };
      let committing = false;
      const onError = () => {
        health.broken = true;
      };
      client.on("error", onError);
      const isBroken = () => health.broken;
      try {
        await client.query("BEGIN");
        await client.query(sandboxManifestMigration);
        if (isBroken()) {
          throw new SandboxManifestError("UNAVAILABLE", "Migration connection was interrupted");
        }
        committing = true;
        await client.query("COMMIT");
        if (isBroken()) {
          throw new SandboxManifestError("UNAVAILABLE", "Migration commit requires reconciliation");
        }
      } catch {
        if (committing) {
          health.broken = true;
        } else {
          try {
            await client.query("ROLLBACK");
          } catch {
            health.broken = true;
          }
        }
        throw new SandboxManifestError(
          "UNAVAILABLE",
          "Migration requires same-identity reconciliation",
        );
      } finally {
        client.removeListener("error", onError);
        client.release(isBroken());
      }
    },
    seedManifest: createManifestRegistration({ store, authorization: options.authorization }),
  });
}
