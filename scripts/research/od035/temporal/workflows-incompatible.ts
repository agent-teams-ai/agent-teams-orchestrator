import { sleep } from '@temporalio/workflow';
import { activationFlow, type ActivationInput } from './workflow-common.ts';
export { durableTimer } from './workflow-common.ts';
export async function activation(input: ActivationInput): Promise<string> {
  await sleep('10ms');
  return activationFlow(input);
}
