import { SandboxManifestError } from './api.js';
import type { SandboxManifestApi } from './api.js';
import type { ManifestAuthorization, ManifestStore } from './ports/manifest-store.js';
import { assertManifest, assertManifestResource } from './manifest-validation.js';
export function createManifestApi(dependencies: { readonly store: Pick<ManifestStore,'read'>; readonly authorization: ManifestAuthorization }): SandboxManifestApi {
  return { async getManifest(context, input) {
    context=structuredClone(context);input=structuredClone(input);
    assertManifestResource(context, input.name, 'contextManifests');
    await dependencies.authorization.assertAuthorized(context, 'context.read', input.name);
    const manifest = await dependencies.store.read(context, input.name);
    if (!manifest) {throw new SandboxManifestError('NOT_FOUND', 'Manifest is not registered');}
    assertManifest(context, manifest);
    return structuredClone(manifest);
  } };
}
