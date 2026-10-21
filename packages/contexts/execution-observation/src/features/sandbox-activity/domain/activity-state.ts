export type ActivityKind = 'TEXT_DELTA' | 'TEXT_SNAPSHOT' | 'TEXT_COMPLETE' | 'TOOL' | 'DIAGNOSTIC';
export interface ActivityFact {
  readonly eventId: string; readonly run: string; readonly participant: string; readonly kind: ActivityKind;
  readonly text: string; readonly internal: boolean; readonly blockId: string; readonly task?: string;
  readonly runtimeOperationRef?: string; readonly recordedAt: string;
}
export interface RuntimeBinding { readonly run: string; readonly participant: string; readonly runtimeSessionRef: string; readonly task?: string; }
export interface Evidence extends RuntimeBinding {
  readonly sourceEventId: string; readonly sourceSequence: string; readonly kind: ActivityKind;
  readonly text: string; readonly internal: boolean; readonly blockId: string; readonly runtimeOperationRef?: string;
}
export interface FeedFact { readonly eventId: string; readonly resourceName: string; readonly change: 'upsert'; readonly sequence: string; readonly internal: boolean; }
export interface ActivityState {
  readonly binding: RuntimeBinding; readonly sequence: string; readonly sourceSequence: string; readonly gap: boolean; readonly gapSequence: string;
  readonly items: readonly ActivityFact[]; readonly history: readonly ActivityFact[]; readonly events: readonly FeedFact[];
  readonly receipts: readonly { readonly sourceEventId: string; readonly fingerprint: string; readonly sequence: string }[];
}
export function evidenceFingerprint(value: Evidence): string {
  return JSON.stringify([value.run,value.participant,value.runtimeSessionRef,value.task ?? null,value.sourceEventId,
    value.sourceSequence,value.kind,value.text,value.internal,value.blockId,value.runtimeOperationRef ?? null]);
}
export function bindingFingerprint(value: RuntimeBinding): string { return JSON.stringify([value.run,value.participant,value.runtimeSessionRef,value.task ?? null]); }
const blockKey = (value: ActivityFact): string => JSON.stringify([value.participant,value.blockId,value.runtimeOperationRef ?? null]);
/** Snapshot replaces, true delta appends, completion never appends cumulative text twice. */
export function projectActivity(items: readonly ActivityFact[], next: ActivityFact): readonly ActivityFact[] {
  const projected:ActivityFact=next.kind==='TEXT_DELTA'?{...next,kind:'TEXT_SNAPSHOT'}:next;
  const index = items.findIndex(item => blockKey(item) === blockKey(next));
  if (index < 0) {return [...items, projected];}
  const previous = items[index];
  if (!previous) {return [...items,projected];}
  const text = next.kind === 'TEXT_DELTA' ? previous.text + next.text : next.kind === 'TEXT_COMPLETE' && next.text === '' ? previous.text : next.text;
  return items.map((item, position) => position === index ? {...projected, text} : item);
}
