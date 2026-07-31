---
id: research.legacy-electron-opencode-behavior-audit-2026-07-30
type: research
status: active
owner: migration/desktop
summary: Read-only evidence audit of legacy Electron and OpenCode behavior that must inform migration without transferring runtime ownership into the orchestrator.
related:
  - ADR-0003
  - ADR-0029
  - ADR-0063
  - ADR-0065
  - architecture.migration-boundary
  - architecture.runtime-boundary
  - OD-004
  - OD-010
  - OD-013
---

# Legacy Electron and OpenCode Behavior Audit, 2026-07-30

## Question

Which production scenarios in the legacy Electron application and orchestrator
must survive the migration, and which implementation structures must not be
copied into the new core?

## Sources and method

The audit was read-only. It inspected implementation and tests without launching
agents or touching a user project.

```text
Legacy orchestrator
repository: agent_teams_orchestrator
branch: fix/opencode-provider-verification
commit: addb0bd5ab7f072c2d78b933c002022d3007699e

Electron hosted-boundary worktree
repository: agent-teams-ai
branch: refactor/hosted-web-feature-boundaries
commit: f7fb783a60e984b648a01e2bba9d01f3d52746da
```

The code is evidence, not architecture authority. Findings were classified using
the disposition rules in the migration boundary.

## Confirmed behavior and ownership

| Confirmed scenario | Target invariant | Target owner |
|---|---|---|
| Process created, runtime reachable, context applied, bootstrap confirmed, permission blocked, and participant ready are distinct observations | Readiness is typed evidence, never one boolean | AR publishes technical evidence; Run Orchestration derives product readiness |
| One provider lane may be ready while another launches, waits for permission, or fails | Participant failures remain isolated unless typed Run policy propagates cancellation | Run Orchestration |
| A late reconcile can promote a participant without relaunching healthy sessions | Reconciliation compares desired and observed state before creating a new effect | Run Orchestration plus AR capability contract |
| Old launch, message, permission, reconcile, or stop work may arrive after replacement | Every side effect checks current Run authority and runtime binding before dispatch | Semantic feature owner; AR checks its private execution authority |
| Context injection may be accepted without creating a model turn | Context application is a separate capability with a durable receipt; unexpected provider output is an anomaly | Agent Context and Run Orchestration intent; AR application mechanism |
| A permission request may block activation without representing failure | Pending interaction is independent from lifecycle, health, and terminal outcome | AR technical state plus Orchestrator approval routing |
| A stop request may have crossed the process boundary before cancellation or timeout | Uncertain stop preserves ownership evidence and enters reconciliation; it never clears a replacement owner | AR |
| A process spawn may be ambiguous after a crash | Persist exact spawn identity before the effect; ambiguous outcome becomes operator or controlled recovery work | AR |
| A delivery may be accepted, written, observed, or processed at different times | Durable intent, destination identity, receipt, and processing acknowledgement are separate | Agent Communication for product messages; AR for runtime input |
| Command outcome must not regress after stronger evidence is committed | Outcomes are monotonic; corrupt or incomplete evidence becomes unknown and reconcilable | Owning feature |
| Credential refresh and provider-store synchronization race across processes | Credential custody, refresh locking, redaction, and provider precedence stay outside Orchestrator | AR runtime capacity and security |
| A provider listed in inventory may still fail a real execution probe | Capability and execution proof carry freshness and binding identity | AR |
| A provider host may be adopted by another process | Adoption requires an exact host identity and cross-process startup serialization | AR |
| Provider status may remain busy after durable transcript completion | Contradictory observations use an explicit precedence and reconciliation matrix | AR |
| Provider message identifiers may have provider-specific ordering constraints | Input is blocked when the adapter cannot prove safe canonical ordering | AR |
| Workspace trust may refer to a canonical repository while execution uses a worktree | Authority, materialization identity, and spawn-time path validation remain separate | Workspace Registry, Access Control, Policy and Risk, and AR |
| Runtime snapshots merge several technical sources and apply UI smoothing | Canonical projections expose revision, cursor, observation time, freshness, and confidence; anti-flicker windows stay in clients | Orchestrator projection plus client adapter |
| Electron IPC and hosted HTTP expose overlapping but unequal Team capabilities | All public transports invoke the same application ports and pass one capability conformance suite | Inbound adapters |
| Team messages, system notifications, and runtime diagnostics share legacy DTOs | Compatibility mapping preserves UI behavior without making one canonical Message union | Agent Communication, Notification Management, and AR |

## Evidence anchors

- Hosted process intent fingerprints workspace binding, binary binding, argument
  digest, environment policy, relay scope, and spawn nonce in
  `src/features/team-runtime-control/core/domain/process-supervision/SpawnIntent.ts:19`.
- Exact ownership proof and monotonic status sequence are modeled in
  `src/features/team-runtime-control/core/domain/process-supervision/ProcessOwnershipRecord.ts:12`.
- Ambiguous spawn recovery becomes `operator_required` in
  `src/features/team-runtime-control/core/application/process-supervision/RecoverProcessOwnership.ts:47`.
- Stop uncertainty becomes `unclassified_residual` after the durable stop marker
  in `src/features/team-runtime-control/core/application/process-supervision/StopOwnedProcess.ts:51`.
- The current broad runtime interface combines prepare, launch, reconcile, stop,
  and permissions in
  `src/main/services/team/runtime/TeamRuntimeAdapter.ts:230`.
- OpenCode readiness separately evaluates installation, authentication, version,
  runtime store, MCP, model, and execution evidence in
  `src/main/services/team/opencode/readiness/OpenCodeTeamLaunchReadiness.ts:21`.
- Durable message delivery identity and monotonic committed receipts are present
  in `src/main/services/team/opencode/delivery/RuntimeDeliveryJournal.ts:131`.
- The old OpenCode bridge explicitly distinguishes context injection from a model
  turn using `noReply` in
  `src/services/opencode/OpenCodeSessionBridge.ts:1042`.
- Partial-lane isolation, late promotion, stale-command rejection, and exact
  single-lane stop are covered throughout
  `src/services/teamBootstrap/teamBootstrapMixedOpenCodeHandoff.safe-e2e.test.ts`,
  including lines 949, 10374, 14610, and 15077.
- Cross-process credential locking and secret redaction are exercised in
  `src/services/opencode/OpenCodeAuthStore.test.ts:84`.
- Execution-proof freshness and runtime-identity binding are exercised in
  `src/services/opencode/OpenCodeExecutionProof.test.ts:68`.
- Exact host adoption and cross-process startup serialization are exercised in
  `src/services/opencode/OpenCodeHostManager.test.ts:86`.
- Provider-message ordering and contradictory-observation handling are exercised
  in `src/services/opencode/OpenCodeSessionBridge.test.ts:1589` and
  `src/services/opencode/OpenCodeEventTranslator.test.ts:59`.
- Legacy client coupling remains concentrated in `TeamCreateRequest`,
  `TeamProvisioningProgress`, and `TeamAgentRuntimeSnapshot` at
  `src/shared/types/team.ts:1505`, `:1594`, and `:1348`.
- The broad legacy `TeamsAPI` begins at `src/shared/types/api.ts:513`; it is a
  compatibility surface, not the target SDK capability layout.

Paths before the `Legacy client coupling` item refer to the repository named by
the relevant finding: hosted process and delivery paths are in the Electron
worktree; old bridge and bootstrap paths are in the legacy orchestrator.

## Disposition matrix

| Legacy area | Disposition | Reason |
|---|---|---|
| IPC methods and shared Team DTOs | Temporary compatibility adapter and fixture source | Existing Desktop depends on observable shapes, not the new domain model |
| Broad `TeamsAPI` | Temporary compatibility facade only | The public SDK uses narrow capabilities rather than one Team god-interface |
| Partial-failure, stale-owner, recovery, permission, and delivery tests | Behavioral oracle and contract fixture source | They encode real failure scenarios |
| Process supervision, host management, credentials, execution probes, provider codecs | AR-owned donor or oracle | Copying them into Orchestrator would recreate dual runtime ownership |
| Broad `TeamLaunchRuntimeAdapter` | Obsolete as a target abstraction | Replace with narrow consumer-owned ports and the AR Published Language ACL |
| `TeamProvisioningService` compatibility facades | Temporary migration adapters | They may preserve old IPC behavior but cannot become new application core |
| Provider-specific progress and diagnostic strings | Migration-only projection mapping | Stable target contracts use typed provider-neutral evidence and safe diagnostics |
| Renderer snapshot stabilization and equality heuristics | Client projection policy | Anti-flicker behavior remains useful but timeout windows never become domain policy |
| JSON files, in-memory maps, PID/path/session-name authority | Obsolete | Durable identity cannot be reconstructed from technical display fields |
| Delivery-journal and command-outcome algorithms | Re-derived algorithm plus conformance fixtures | Preserve semantics, not provider-coupled storage or class structure |

## Newly exposed design requirements

1. The AR Published Language needs capability-specific context application, input
   acceptance, permission, observation, cancellation, and recovery results. One
   broad runtime gateway is insufficient.
2. Runtime observations need freshness, source cursor, binding identity, and
   typed evidence stage. Product readiness remains an orchestrator projection.
3. The Desktop facade needs an explicit mapping from durable Operations, Run
   projections, runtime observations, and feeds into the old progress and
   snapshot DTOs.
4. Migration conformance must include partial lane failure, permission wait,
   stale replacement, late reconcile, context-without-turn, ambiguous delivery,
   uncertain stop, and restart recovery.
5. Provider hosts may be shared by multiple sessions. Product cancellation of
   one Run must never imply killing a shared provider host.
6. AR provider conformance must define exact host-adoption identity,
   cross-process startup single-flight, canonical provider-message ordering, and
   precedence when live status conflicts with durable transcript evidence.
7. Workspace authority must distinguish canonical trust scope from one concrete
   materialization and revalidate the concrete execution path immediately before
   spawn.
8. IPC, HTTP, Connect, and the handwritten SDK must run one application-capability
   conformance suite. Provider-specific HTTP routes do not become Orchestrator
   public contracts.
9. The compatibility facade must split legacy message, notification, and runtime
   diagnostic variants before invoking their owning application capabilities.

## Limitations

- This was source and test archaeology, not a fresh end-to-end execution.
- The inspected legacy orchestrator worktree contains uncommitted OpenCode changes;
  those files were treated as evidence only and were not modified.
- Exact public AR contract names remain owned by the AR repository.
- Legacy tests contain duplicated and implementation-specific cases; migration
  should curate a smaller provider-neutral conformance matrix rather than copy the
  entire suite.
