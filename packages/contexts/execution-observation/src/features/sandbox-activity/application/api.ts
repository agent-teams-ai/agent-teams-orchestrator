export interface ActivityRequestContext { readonly tenantId: string; readonly projectId: string; readonly principalId: string; }
export type ActivityKind = 'TEXT_DELTA' | 'TEXT_SNAPSHOT' | 'TEXT_COMPLETE' | 'TOOL' | 'DIAGNOSTIC';
export interface Activity {
  readonly eventId: string; readonly run: string; readonly participant: string; readonly kind: ActivityKind;
  readonly text: string; readonly internal: boolean; readonly blockId: string; readonly task?: string;
  readonly runtimeOperationRef?: string; readonly recordedAt: string;
}
export interface ActivitySnapshot {
  readonly items: readonly Activity[]; readonly watermark: string; readonly cursor: string;
  readonly freshness: 'current' | 'incomplete'; readonly gap: boolean; readonly nextPageToken?: string;
}
export interface ActivityFeedPage {
  readonly events: readonly { readonly eventId: string; readonly resourceName: string; readonly change: 'upsert'; readonly sequence: string }[];
  readonly nextCursor: string; readonly gap: boolean;
}
export interface SandboxActivityApi {
  listActivity(context: ActivityRequestContext, input: { readonly run: string; readonly pageSize: number; readonly pageToken?: string }): Promise<ActivitySnapshot>;
  readFeed(context: ActivityRequestContext, input: { readonly run: string; readonly pageSize: number; readonly cursor?: string }): Promise<ActivityFeedPage>;
}
export interface ActivityRuntimeBinding { readonly run: string; readonly participant: string; readonly runtimeSessionRef: string; readonly task?: string; }
export interface ActivityEvidence extends ActivityRuntimeBinding {
  readonly sourceEventId: string; readonly sourceSequence: string; readonly kind: ActivityKind; readonly text: string;
  readonly internal: boolean; readonly blockId: string; readonly runtimeOperationRef?: string;
}
export class SandboxActivityError extends Error {
  constructor(readonly code: 'INVALID_ARGUMENT' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'CONFLICT' | 'STALE' | 'UNAVAILABLE' | 'RESOURCE_EXHAUSTED', message: string) { super(message); this.name = 'SandboxActivityError'; }
}
