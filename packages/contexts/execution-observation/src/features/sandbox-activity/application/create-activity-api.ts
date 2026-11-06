import { SandboxActivityError } from './api.js';
import type { SandboxActivityApi } from './api.js';
import type { ActivityAuthorization, ActivityStore } from './ports/activity-store.js';
import { activityPageSize, activityResource } from './activity-validation.js';
function assertActivityReadInput(value: unknown): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new SandboxActivityError('INVALID_ARGUMENT', 'Invalid Activity read request');
  }
}
export function createActivityApi(dependencies: { readonly store: Pick<ActivityStore,'list'|'feed'>; readonly authorization: ActivityAuthorization }): SandboxActivityApi {
  return {
    async listActivity(context,input) {
      assertActivityReadInput(input);
      context=structuredClone(context);input=structuredClone(input);
      activityResource(context,input.run,'runs'); activityPageSize(input.pageSize);
      const grant = await dependencies.authorization.assertAuthorized(context,'activity.read',input.run);
      return dependencies.store.list(context,input,{...grant});
    },
    async readFeed(context,input) {
      assertActivityReadInput(input);
      context=structuredClone(context);input=structuredClone(input);
      activityResource(context,input.run,'runs'); activityPageSize(input.pageSize);
      const grant = await dependencies.authorization.assertAuthorized(context,'activity.read',input.run);
      return dependencies.store.feed(context,input,{...grant});
    },
  };
}
