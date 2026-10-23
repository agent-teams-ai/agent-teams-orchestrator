import { activationFlow, type ActivationInput } from './workflow-common.ts';
export { durableTimer } from './workflow-common.ts';
export async function activation(input: ActivationInput): Promise<string> {
  return activationFlow(input);
}
