import { patched, sleep } from '@temporalio/workflow';
import { activationFlow, type ActivationInput } from './workflow-common.ts';
export { durableTimer } from './workflow-common.ts';
export async function activation(input: ActivationInput): Promise<string> {
  if (patched('approval-prelude-v2')) {await sleep('10ms');}
  return activationFlow(input);
}
