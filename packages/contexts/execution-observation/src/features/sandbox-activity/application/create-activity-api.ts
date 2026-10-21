import type { SandboxActivityApi } from './api.js';
import type { ActivityAuthorization, ActivityStore } from './ports/activity-store.js';
import { activityPageSize, activityResource } from './activity-validation.js';
export function createActivityApi(dependencies: { readonly store: Pick<ActivityStore,'list'|'feed'>; readonly authorization: ActivityAuthorization }): SandboxActivityApi {
  return {
    async listActivity(context,input) {
      context=structuredClone(context);input=structuredClone(input);
      activityResource(context,input.run,'runs'); activityPageSize(input.pageSize);
      const grant = await dependencies.authorization.assertAuthorized(context,'activity.read',input.run);
      return dependencies.store.list(context,input,{...grant});
    },
    async readFeed(context,input) {
      context=structuredClone(context);input=structuredClone(input);
      activityResource(context,input.run,'runs'); activityPageSize(input.pageSize);
      const grant = await dependencies.authorization.assertAuthorized(context,'activity.read',input.run);
      return dependencies.store.feed(context,input,{...grant});
    },
  };
}
