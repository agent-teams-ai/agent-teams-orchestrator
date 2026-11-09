import { SandboxActivityError } from './api.js';
import type { SandboxActivityApi } from './api.js';
import type { ActivityAuthorization, ActivityStore } from './ports/activity-store.js';
import { activityPageSize, activityResource } from './activity-validation.js';
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
function cloneActivityReadValue<T>(value: T, code: 'INVALID_ARGUMENT' | 'PERMISSION_DENIED'): T {
  try {
    return structuredClone(value);
  } catch {
    // Accessors can throw arbitrary errors during cloning, not only DataCloneError.
    // Untrusted input must never leak an untyped exception to the caller.
    throw new SandboxActivityError(code, code === 'PERMISSION_DENIED'
      ? 'Activity scope does not match authenticated authority'
      : 'Invalid Activity read request');
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
