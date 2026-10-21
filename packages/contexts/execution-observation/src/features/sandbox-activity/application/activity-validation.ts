import { SandboxActivityError } from './api.js';
import type { ActivityEvidence, ActivityRequestContext, ActivityRuntimeBinding } from './api.js';
const segment = /^[A-Za-z0-9_-]+$/u;
export function activityScope(context: ActivityRequestContext): void {
  const parts = context.projectId.split('/');
  if (parts.length !== 4 || parts[0] !== 'tenants' || parts[2] !== 'projects' || parts[1] !== context.tenantId ||
      !segment.test(parts[1]) || !segment.test(parts[3] ?? '') || !context.principalId.trim()) {
    throw new SandboxActivityError('PERMISSION_DENIED', 'Activity scope does not match authenticated authority');
  }
}
export function activityResource(context: ActivityRequestContext, value: string, collection: string): void {
  activityScope(context); const prefix = `${context.projectId}/${collection}/`;
  if (typeof value !== 'string' || !value.startsWith(prefix) || !segment.test(value.slice(prefix.length))) {throw new SandboxActivityError('INVALID_ARGUMENT', 'Invalid Activity resource scope');}
}
export function activityBinding(context: ActivityRequestContext, binding: ActivityRuntimeBinding): void {
  activityResource(context,binding.run,'runs'); activityResource(context,binding.participant,'participants');
  if (binding.task !== undefined) {activityResource(context,binding.task,'tasks');}
  if (typeof binding.runtimeSessionRef !== 'string' || !/^[A-Za-z0-9:._/-]{1,512}$/u.test(binding.runtimeSessionRef)) {throw new SandboxActivityError('INVALID_ARGUMENT','Invalid opaque runtime reference');}
}
function unsafeActivityText(text: string): boolean {
  return Array.from(text).some(character => {
    const code=character.charCodeAt(0);
    return (code<32 && ![9,10,13].includes(code)) || code===127 || (code>=0x202a && code<=0x202e) || (code>=0x2066 && code<=0x2069);
  });
}
export function activityEvidence(context: ActivityRequestContext, value: ActivityEvidence): void {
  activityBinding(context,value);
  if (typeof value.sourceSequence !== 'string' || !/^[1-9][0-9]{0,18}$/u.test(value.sourceSequence) || BigInt(value.sourceSequence) > 9223372036854775807n ||
      typeof value.sourceEventId !== 'string' || !/^[A-Za-z0-9:._-]{1,256}$/u.test(value.sourceEventId) || typeof value.blockId !== 'string' || !/^[A-Za-z0-9:._-]{1,256}$/u.test(value.blockId) ||
      !['TEXT_DELTA','TEXT_SNAPSHOT','TEXT_COMPLETE','TOOL','DIAGNOSTIC'].includes(value.kind) || typeof value.internal !== 'boolean' ||
      typeof value.text !== 'string' || value.text.length > 16384 || unsafeActivityText(value.text) ||
      value.runtimeOperationRef !== undefined && (typeof value.runtimeOperationRef !== 'string' || !/^[A-Za-z0-9:._/-]{1,512}$/u.test(value.runtimeOperationRef))) {
    throw new SandboxActivityError('INVALID_ARGUMENT','Unsupported or unsafe normalized Activity evidence');
  }
}
export function activityPageSize(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 100) {throw new SandboxActivityError('INVALID_ARGUMENT','Page size must be between 1 and 100');}
}
