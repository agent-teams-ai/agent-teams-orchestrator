import {SandboxActivityError} from './api.js';
import type {ActivityEvidence,ActivityRequestContext,ActivityRuntimeBinding} from './api.js';
import type {ActivityAuthorization,ActivityStore} from './ports/activity-store.js';
import {activityBinding,activityEvidence} from './activity-validation.js';
function cloneIngressValue<T>(value:T,code:'PERMISSION_DENIED'|'INVALID_ARGUMENT'):T {
  try {
    return structuredClone(value);
  } catch {
    // Functions, Symbols and throwing accessors must never leak raw clone exceptions.
    throw new SandboxActivityError(code,code==='PERMISSION_DENIED'
      ? 'Activity scope does not match authenticated authority'
      : 'Invalid Activity ingress payload');
  }
}
/** Authenticated runtime ingress; provider content cannot select its trusted principal or scope. */
export function createActivityAdmission(dependencies:{store:Pick<ActivityStore,'bind'|'append'>;authorization:ActivityAuthorization}) {
  return {
    async bindRuntime(context:ActivityRequestContext,binding:ActivityRuntimeBinding):Promise<void>{
      context=cloneIngressValue(context,'PERMISSION_DENIED');binding=cloneIngressValue(binding,'INVALID_ARGUMENT');
      activityBinding(context,binding);
      await dependencies.authorization.assertAuthorized(context,'activity.bind',binding.run);
      await dependencies.store.bind(context,{run:binding.run,participant:binding.participant,runtimeSessionRef:binding.runtimeSessionRef,...(binding.task===undefined?{}:{task:binding.task})});
    },
    async append(context:ActivityRequestContext,evidence:ActivityEvidence){
      context=cloneIngressValue(context,'PERMISSION_DENIED');evidence=cloneIngressValue(evidence,'INVALID_ARGUMENT');
      activityEvidence(context,evidence);
      await dependencies.authorization.assertAuthorized(context,'activity.append',evidence.run);
      return dependencies.store.append(context,structuredClone(evidence));
    },
  };
}
