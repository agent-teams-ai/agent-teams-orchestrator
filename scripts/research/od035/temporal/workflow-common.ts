import { condition, defineSignal, proxyActivities, setHandler, sleep } from '@temporalio/workflow';
import type * as activities from './activities.ts';

export const approval = defineSignal('approval');
const activity = proxyActivities<typeof activities>({
  startToCloseTimeout: '6s',
  retry: { initialInterval: '1s', maximumInterval: '2s', maximumAttempts: 5 },
});
export type ActivationInput = { id: string; beforeWaitMs?: number };

export async function activationFlow(input: ActivationInput): Promise<string> {
  let notified = false;
  setHandler(approval, () => { notified = true; });
  if (input.beforeWaitMs !== undefined && input.beforeWaitMs > 0) {await sleep(input.beforeWaitMs);}
  for (;;) {
    const state = await activity.readState(input.id);
    if (state.status === 'cancelled') {return 'cancelled';}
    if (state.approved) {
      return (await activity.activate(input.id, `activate:${input.id}`)).status;
    }
    await condition(() => notified, '2s');
    notified = false;
  }
}

export async function durableTimer(input: { id: string; ms: number }): Promise<string> {
  await sleep(input.ms);
  await activity.timerFired(input.id);
  return 'timer-fired';
}
