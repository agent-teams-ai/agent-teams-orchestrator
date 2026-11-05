import type { PoolClient } from "pg";
import { SandboxManifestError } from "../../../application/api.js";

/** Keep the socket error guard until PostgreSQL pool custody is transferred. */
export function releaseManifestClient(
  client: PoolClient,
  onError: (error: Error) => void,
  isBroken: () => boolean,
  errorMessage: string,
): void {
  try {
    client.release(isBroken());
  } catch {
    // A throwing release has not proved custody transfer; retain the guard.
    throw new SandboxManifestError("UNAVAILABLE", errorMessage);
  }
  client.removeListener("error", onError);
  if (isBroken()) {
    // An error during release cannot be reported as a successful operation.
    throw new SandboxManifestError("UNAVAILABLE", errorMessage);
  }
}
