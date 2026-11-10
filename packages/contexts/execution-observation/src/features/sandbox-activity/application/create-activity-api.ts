import { SandboxActivityError } from './api.js';
import type { SandboxActivityApi } from './api.js';
import type { ActivityAuthorization, ActivityStore } from './ports/activity-store.js';
import { activityPageSize, activityReadTokenInput, activityResource, cloneActivityInput } from './activity-validation.js';
function assertActivityReadInput(value: unknown): void {
  // Array.isArray itself throws for a revoked Proxy from a direct JS caller.
  // Normalize that failure before touching authorization or persistence.
  let isArray: boolean;
  try { isArray = Array.isArray(value); }
  catch { throw new SandboxActivityError('INVALID_ARGUMENT', 'Invalid Activity read request'); }
  if (value === null || typeof value !== 'object' || isArray) {
    throw new SandboxActivityError('INVALID_ARGUMENT', 'Invalid Activity read request');
  }
}
export function createActivityApi(dependencies: { readonly store: Pick<ActivityStore,'list'|'feed'>; readonly authorization: ActivityAuthorization }): SandboxActivityApi {
  return {
    async listActivity(context,input) {
      assertActivityReadInput(input);
      context=cloneActivityInput(context,'PERMISSION_DENIED');input=cloneActivityInput(input,'INVALID_ARGUMENT');
      activityResource(context,input.run,'runs'); activityPageSize(input.pageSize); activityReadTokenInput(input.pageToken);
      const grant = await dependencies.authorization.assertAuthorized(context,'activity.read',input.run);
      return dependencies.store.list(context,input,{...grant});
    },
    async readFeed(context,input) {
      assertActivityReadInput(input);
      context=cloneActivityInput(context,'PERMISSION_DENIED');input=cloneActivityInput(input,'INVALID_ARGUMENT');
      activityResource(context,input.run,'runs'); activityPageSize(input.pageSize); activityReadTokenInput(input.cursor);
      const grant = await dependencies.authorization.assertAuthorized(context,'activity.read',input.run);
      return dependencies.store.feed(context,input,{...grant});
    },
  };
}
