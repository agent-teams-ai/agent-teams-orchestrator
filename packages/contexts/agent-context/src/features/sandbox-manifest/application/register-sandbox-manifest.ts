import type { ManifestRequestContext, SandboxManifest } from "./api.js";
import type { ManifestAuthorization, ManifestStore } from "./ports/manifest-store.js";
import { assertManifest } from "./manifest-validation.js";
/** Host-only bootstrap use case. Registered source references never become execution authority. */
export function createManifestRegistration(dependencies: {
  store: Pick<ManifestStore, "seed">;
  authorization: ManifestAuthorization;
}) {
  return async (context: ManifestRequestContext, manifest: SandboxManifest): Promise<void> => {
    context = structuredClone(context);
    manifest = structuredClone(manifest);
    assertManifest(context, manifest);
    await dependencies.authorization.assertAuthorized(context, "context.seed", manifest.name);
    await dependencies.store.seed(context, structuredClone(manifest));
  };
}
