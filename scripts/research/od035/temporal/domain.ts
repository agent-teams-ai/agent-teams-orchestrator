export type ActivationState = { approved: boolean; status: string; effects: number };

// Representative owning-feature decision: no Temporal imports or scheduler state.
export function activationDecision(state: ActivationState): 'activate' | 'wait' | 'stop' {
  if (state.status === 'cancelled' || state.status === 'active') {return 'stop';}
  return state.approved ? 'activate' : 'wait';
}
