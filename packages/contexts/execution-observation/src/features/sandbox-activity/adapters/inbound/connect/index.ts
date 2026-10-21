import { create } from '@bufbuild/protobuf';
import { Code, ConnectError } from '@connectrpc/connect';
import type { ConnectRouter, HandlerContext } from '@connectrpc/connect';
import { FeedPageSchema } from '../../../../../generated/agentteams/control/v1/control_pb.js';
import { ActivityKind, ActivitySchema, ActivityService, ActivitySnapshotSchema } from '../../../../../generated/agentteams/execution_observation/v1/activity_pb.js';
import { SandboxActivityError } from '../../../application/api.js';
import type { Activity, ActivityRequestContext, SandboxActivityApi } from '../../../application/api.js';
import { microsToTimestamp } from './time.js';

function activityToWire(value: Activity) {
  return create(ActivitySchema, { eventId: value.eventId, run: value.run, participant: value.participant, kind: ActivityKind[value.kind],
    text: value.text, internal: value.internal, blockId: value.blockId, recordedAt: microsToTimestamp(value.recordedAt),
    ...(value.task === undefined ? {} : { task: value.task }), ...(value.runtimeOperationRef === undefined ? {} : { runtimeOperationRef: value.runtimeOperationRef }) });
}
async function activityControlCall<T>(call: () => Promise<T>): Promise<T> {
  try { return await call(); }
  catch (error) {
    if (error instanceof ConnectError) { throw error; }
    if (error instanceof SandboxActivityError) {
      const codes = { INVALID_ARGUMENT: Code.InvalidArgument, PERMISSION_DENIED: Code.PermissionDenied, NOT_FOUND: Code.NotFound, CONFLICT: Code.Aborted, STALE: Code.FailedPrecondition, UNAVAILABLE: Code.Unavailable, RESOURCE_EXHAUSTED: Code.ResourceExhausted } as const;
      throw new ConnectError(error.code === 'PERMISSION_DENIED' ? 'FORBIDDEN' : error.code, codes[error.code]);
    }
    throw new ConnectError('UNAVAILABLE', Code.Unavailable);
  }
}
export function registerActivityControl(router: ConnectRouter, dependencies: { readonly api: SandboxActivityApi; readonly authenticate: (context: HandlerContext) => Promise<ActivityRequestContext> }): void {
  const { api, authenticate } = dependencies;
  router.service(ActivityService, {
    listActivity: (request, context) => activityControlCall(async () => {
      const authority = await authenticate(context);
      if (request.parent !== authority.projectId || request.run === undefined || request.conversation !== undefined || request.teamVersion !== undefined) { throw new ConnectError('INVALID_ARGUMENT', Code.InvalidArgument); }
      const result = await api.listActivity(authority, { run: request.run, pageSize: request.pageSize, ...(request.pageToken === undefined ? {} : { pageToken: request.pageToken }) });
      return create(ActivitySnapshotSchema, { items: result.items.map(activityToWire), watermark: result.watermark, cursor: result.cursor, freshness: result.freshness, gap: result.gap, ...(result.nextPageToken === undefined ? {} : { nextPageToken: result.nextPageToken }) });
    }),
    readFeed: (request, context) => activityControlCall(async () => {
      const authority = await authenticate(context);
      if (request.parent !== authority.projectId || request.run === undefined || request.conversation !== undefined || request.teamVersion !== undefined) { throw new ConnectError('INVALID_ARGUMENT', Code.InvalidArgument); }
      const result = await api.readFeed(authority, { run: request.run, pageSize: request.pageSize, ...(request.cursor === undefined ? {} : { cursor: request.cursor }) });
      return create(FeedPageSchema, { events: result.events.map((event) => ({ eventId: event.eventId, resourceName: event.resourceName, change: event.change })), nextCursor: result.nextCursor, gap: result.gap });
    }),
  });
}
