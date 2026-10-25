import assert from "node:assert/strict";
import test from "node:test";
import { createManifestApi } from "../../../dist/features/sandbox-manifest/application/create-manifest-api.js";
import { createManifestRegistration } from "../../../dist/features/sandbox-manifest/application/register-sandbox-manifest.js";
test("manifest read and registration retain entry authority while authorization is pending", async () => {
  const scope = {
    tenantId: "TEST_tenant",
    projectId: "tenants/TEST_tenant/projects/TEST_project",
    principalId: "TEST_subject",
  };
  const manifest = {
    name: `${scope.projectId}/contextManifests/one`,
    workspace: `${scope.projectId}/workspaces/one`,
    agentProfileVersion: `${scope.projectId}/agentProfileVersions/one`,
    runPolicySnapshot: `${scope.projectId}/runPolicySnapshots/one`,
    instructionRef: "instructions:one",
    createdAt: "1",
  };
  for (const write of [false, true]) {
    const context = { ...scope };
    const value = { ...manifest };
    const input = { name: manifest.name };
    const { promise: gate, resolve: release } = Promise.withResolvers<null>();
    let observed: unknown;
    const authorization = {
      async assertAuthorized() {
        await gate;
      },
    };
    const operation = write
      ? createManifestRegistration({
          authorization,
          store: {
            async seed(received, facts) {
              observed = { context: received, facts };
            },
          },
        })(context, value)
      : createManifestApi({
          authorization,
          store: {
            async read(received, name) {
              observed = { context: received, name };
              return manifest;
            },
          },
        }).getManifest(context, input);
    context.principalId = "TEST_other";
    context.projectId = "tenants/TEST_tenant/projects/other";
    value.instructionRef = "instructions:changed";
    input.name = `${scope.projectId}/contextManifests/other`;
    release(null);
    await operation;
    assert.deepEqual(
      observed,
      write ? { context: scope, facts: manifest } : { context: scope, name: manifest.name },
    );
  }
});
