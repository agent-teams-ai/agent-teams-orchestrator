import { SandboxActivityError } from './api.js';
import type { SandboxActivityApi } from './api.js';
import type { ActivityAuthorization, ActivityStore } from './ports/activity-store.js';
import { activityPageSize, activityResource } from './activity-validation.js';
function assertActivityReadInput(value: unknown): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new SandboxActivityError('INVALID_ARGUMENT', 'Invalid Activity read request');
  }
}
function cloneActivityReadValue<T>(value: T, code: 'INVALID_ARGUMENT' | 'PERMISSION_DENIED'): T {
  try {
    return structuredClone(value);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'DataCloneError') {
      throw new SandboxActivityError(code, code === 'PERMISSION_DENIED'
        ? 'Activity scope does not match authenticated authority'
        : 'Invalid Activity read request');
    }
    throw error;
  }
}
export function createActivityApi(dependencies: { readonly store: Pick<ActivityStore,'list'|'feed'>; readonly authorization: ActivityAuthorization }): SandboxActivityApi {
  return {
    async listActivity(context,input) {
      assertActivityReadInput(input);
      context=cloneActivityReadValue(context,'PERMISSION_DENIED');input=cloneActivityReadValue(input,'INVALID_ARGUMENT');
      activityResource(context,input.run,'runs'); activityPageSize(input.pageSize);
      const grant = await dependencies.authorization.assertAuthorized(context,'activity.read',input.run);
      return dependencies.store.list(context,input,{...grant});
    },
    async readFeed(context,input) {
      assertActivityReadInput(input);
      context=cloneActivityReadValue(context,'PERMISSION_DENIED');input=cloneActivityReadValue(input,'INVALID_ARGUMENT');
      activityResource(context,input.run,'runs'); activityPageSize(input.pageSize);
      const grant = await dependencies.authorization.assertAuthorized(context,'activity.read',input.run);
      return dependencies.store.feed(context,input,{...grant});
    },
  };
}
