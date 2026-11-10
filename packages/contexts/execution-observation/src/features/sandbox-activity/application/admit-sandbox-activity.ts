import type {ActivityEvidence,ActivityRequestContext,ActivityRuntimeBinding} from './api.js';
import type {ActivityAuthorization,ActivityStore} from './ports/activity-store.js';
import {activityBinding,activityEvidence,cloneActivityInput} from './activity-validation.js';
/** Authenticated runtime ingress; provider content cannot select its trusted principal or scope. */
export function createActivityAdmission(dependencies:{store:Pick<ActivityStore,'bind'|'append'>;authorization:ActivityAuthorization}) {
  return {
    async bindRuntime(context:ActivityRequestContext,binding:ActivityRuntimeBinding):Promise<void>{
      context=cloneActivityInput(context,'PERMISSION_DENIED');binding=cloneActivityInput(binding,'INVALID_ARGUMENT');
      activityBinding(context,binding);
      await dependencies.authorization.assertAuthorized(context,'activity.bind',binding.run);
      await dependencies.store.bind(context,{run:binding.run,participant:binding.participant,runtimeSessionRef:binding.runtimeSessionRef,...(binding.task===undefined?{}:{task:binding.task})});
    },
    async append(context:ActivityRequestContext,evidence:ActivityEvidence){
      context=cloneActivityInput(context,'PERMISSION_DENIED');evidence=cloneActivityInput(evidence,'INVALID_ARGUMENT');
      activityEvidence(context,evidence);
      await dependencies.authorization.assertAuthorized(context,'activity.append',evidence.run);
      // Only declared evidence fields may pass from untrusted ingress to storage.
      const accepted: ActivityEvidence = {
        run:evidence.run,participant:evidence.participant,runtimeSessionRef:evidence.runtimeSessionRef,
        ...(evidence.task===undefined?{}:{task:evidence.task}),
        sourceEventId:evidence.sourceEventId,sourceSequence:evidence.sourceSequence,
        kind:evidence.kind,text:evidence.text,internal:evidence.internal,blockId:evidence.blockId,
        ...(evidence.runtimeOperationRef===undefined?{}:{runtimeOperationRef:evidence.runtimeOperationRef})
      };
      return dependencies.store.append(context,accepted);
    },
  };
}
