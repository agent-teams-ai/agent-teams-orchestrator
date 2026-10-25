import type { ManifestFacts } from "../../domain/manifest.js";
import type { ManifestRequestContext } from "../api.js";
export interface ManifestAuthorization {
  assertAuthorized(
    context: ManifestRequestContext,
    action: "context.read" | "context.seed",
    resource: string,
  ): Promise<void>;
}
export interface ManifestStore {
  read(context: ManifestRequestContext, name: string): Promise<ManifestFacts | undefined>;
  seed(context: ManifestRequestContext, manifest: ManifestFacts): Promise<void>;
}
