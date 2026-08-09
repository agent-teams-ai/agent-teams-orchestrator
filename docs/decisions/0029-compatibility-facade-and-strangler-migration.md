---
id: ADR-0029
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: migration/desktop
summary: Migrate desktop capabilities through a compatibility facade and single-owner strangler rollout.
related:
  - ADR-0003
  - OD-010
  - OD-015
  - architecture.migration-boundary
---

# ADR-0029: Compatibility Facade and Strangler Migration

## Context

The existing desktop application depends on IPC and shared DTO behavior for team
creation, provisioning progress, runtime snapshots, tasks, messages, and logs.
Replacing all behavior in one release would overlap active hosted-web refactoring
and create a high-risk process-lifecycle cutover.

Copying the legacy implementation into the new core would preserve accidental
coupling rather than the required behavior. Running old and new implementations
at the same time would create dual writers and dual process owners.

## Decision

Migration uses a compatibility facade at the existing desktop IPC and shared DTO
boundary. The facade preserves observable client behavior while translating one
accepted capability at a time to the new orchestrator SDK and control contracts.

The rollout follows a strangler sequence:

1. inventory the capability and freeze observable legacy behavior with contract
   fixtures;
2. classify the current implementation as behavioral oracle, reusable algorithm,
   temporary adapter, or obsolete code;
3. implement the accepted owner, application use case, and adapter boundary;
4. verify parity, idempotency, recovery, and rollback in isolated test projects;
5. switch one capability through explicit composition or a kill switch;
6. remove the legacy path only after the cutover is proven.

There is exactly one writer and one process owner for a capability at every stage.
Shadow reads and comparison diagnostics are permitted when they cannot trigger
side effects. Dual writes, dual runtime supervision, and fallback that silently
replays a mutation through another owner are prohibited.

Legacy implementations do not enter new domain or application packages. They may
contribute behavioral tests, contract fixtures, re-derived algorithms, and
temporary compatibility adapters.

The current desktop task board initially remains behind a compatibility adapter.
Work Coordination is the target owner of task semantics; the board is not deeply
rewritten during the first orchestration cutover.

## Consequences

- Desktop and hosted-web work can proceed with smaller conflict surfaces.
- Rollback is capability-scoped rather than a whole-system downgrade.
- Temporary translation code is accepted and explicitly removable.
- Contract inventory and parity tests are required before every cutover.
- Migration takes more steps but avoids ambiguous ownership and large-bang
  recovery.

## Rejected alternatives

- Replace all desktop provisioning and task behavior in one release.
- Copy the legacy orchestrator into the new domain/application core.
- Run old and new runtime writers simultaneously and reconcile later.
- Make the current desktop board the canonical Work Coordination repository.
