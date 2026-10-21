import type { ActivityEvidence, ActivityFeedPage, ActivityRequestContext, ActivityRuntimeBinding, ActivitySnapshot } from '../api.js';
export interface ActivityGrant { readonly epoch: string; readonly allowInternal: boolean; }
export interface ActivityAuthorization { assertAuthorized(context: ActivityRequestContext, action: 'activity.read' | 'activity.append' | 'activity.bind', run: string): Promise<ActivityGrant>; }
export interface ActivityStore {
  bind(context: ActivityRequestContext, binding: ActivityRuntimeBinding): Promise<void>;
  append(context: ActivityRequestContext, evidence: ActivityEvidence): Promise<{ readonly status: 'accepted' | 'duplicate'; readonly sequence: string }>;
  list(context: ActivityRequestContext, input: { readonly run: string; readonly pageSize: number; readonly pageToken?: string }, grant: ActivityGrant): Promise<ActivitySnapshot>;
  feed(context: ActivityRequestContext, input: { readonly run: string; readonly pageSize: number; readonly cursor?: string }, grant: ActivityGrant): Promise<ActivityFeedPage>;
}
