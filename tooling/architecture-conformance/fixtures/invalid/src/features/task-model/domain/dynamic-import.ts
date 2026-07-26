export async function loadInvalidRuntimeClient() {
  return import("../adapters/outbound/runtime-client.js");
}
