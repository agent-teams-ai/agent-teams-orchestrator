---
id: contract.migration.desktop-first-slice.v1
type: contract
status: accepted
owner: migration/desktop
summary: Scoped first server slice contracts, failure fixtures, and admission evidence for a new sandbox team.
related:
  - ADR-0103
  - OD-004
  - OD-006
  - OD-010
  - OD-012
  - OD-026
  - OD-027
  - architecture.implementation-readiness-gates
  - architecture.migration-boundary
  - architecture.public-control-contracts
  - architecture.runtime-boundary
  - domain.contexts.team-topology
  - domain.contexts.run-orchestration
  - domain.contexts.work-coordination
  - domain.contexts.agent-communication
code_anchors:
  - enforcement: advisory
    pattern: scripts/orchestration-specs/desktop-first-slice-v1.test.ts
  - enforcement: advisory
    pattern: scripts/orchestration-specs/fixtures/desktop-first-slice-v1/**
---

# Desktop Runtime Migration Admission v1

## Owner and consumers

`migration/desktop` owns this scoped admission bundle, not the business state.
Consumers are the Desktop facade, authoritative member MCP tools, public SDK and
Connect adapters. All invoke the same feature-owned application commands.
The [package catalog](../../architecture/package-catalog.yaml) reserves these
owners; reservation alone does not permit production materialization.

| Owner | Reserved package | First feature responsibility |
|---|---|---|
| `team-topology` | `packages/contexts/team-topology` | Agent identity, immutable Team version and exclusive current assignment |
| `run-orchestration` | `packages/contexts/run-orchestration` | `team-activation`, Run admission, occupancy, context activation, dispatch and cancellation processes |
| `work-coordination` | `packages/contexts/work-coordination` | Task creation and metadata edits; sole Work lifecycle writer |
| `agent-communication` | `packages/contexts/agent-communication` | Direct Conversation message commit and per-recipient delivery intent |
| `agent-context` | `packages/contexts/agent-context` | Immutable minimal role/instruction/Work context manifest |
| `execution-observation` | `packages/contexts/execution-observation` | Authorized normalized activity and protected diagnostics |
| `integration/runtime` | `packages/integrations/runtime-gateway` | Stateless, separate command and event ACL adapters |
| `clients/sdk` | `packages/sdk/orchestrator` | Connection-free handles, typed reads, waits and bounded subscriptions |
| `architecture/composition` | `apps/orchestrator-server` | Accepted server composition; no business policy |

Scope, workspace, identity and access remain with the existing reserved owning
contexts. Use one new explicitly test-only Project and registered sandbox Workspace;
never accept a raw path as execution authority. Existing security, persistence,
transaction and eventing standards apply without a new storage or broker design.

## Semantic purpose

Admit the smallest real E slice after technical review: a newly owned sandbox
Team, one persistent Agent assigned as its ordinary member, one immutable Team
version and Run, one Task created and edited through authenticated MCP, and a
direct human/member Conversation. A member sends a message to the human through
MCP; the human can send a message to that member. No lead relay or second kernel.
The synthetic fixture seeds one existing canonical Agent and exact immutable
profile version under Team Topology before Team creation. `CreateTeam.agent`
selects that identity; it is not inferred from a profile or display name and no
other context creates an Agent. Assignment validation and Team version creation
are one Topology transaction. Team response carries canonical `agent` and immutable
version `member` references. Run response carries the independent Run participant
reference used for agent Conversation addressing; human subject identity comes
from the bound authority adapter and Conversation audience. The runtime owns the Claude session and RuntimeOperation references. Claude SDK
is selected only at runtime composition, never by a business-domain branch.

This proposal advances the Team Topology S1/S2 pilot to scoped S3/S4. It does not
claim that the current pilot already admits persistence or execution. The full
A-F migration remains required: roster changes, dependencies, assignments,
completion and review, group/cross-team messages, product approvals, compaction,
recovery, OpenCode/Codex parity, logs and archives remain explicit subsequent
capability rows. Task update in this first increment means subject/description;
status, ownership and dependency transitions need the next Work admission. This
scope limit is visible in capabilities, not silent success or deletion authority.

Server-first V1 stays in force. Use the existing Server composition with a fake
runtime first, then an admitted server runtime. No Electron embedded core,
per-Desktop Host sidecar, Fully Local implementation, or local-device-execution
advertisement is introduced. Synthetic evidence cannot qualify a deployment.

## Machine-readable source

The versioned deterministic semantic model is
[`desktop-first-slice-v1.test.ts`](../../scripts/orchestration-specs/desktop-first-slice-v1.test.ts).
It extends the existing `specs:model` and seeded property lane. It performs no IO
or provider launch and is not a production business kernel. Its fixture version
is `desktop-first-slice/v1`. Proposed feature-owned Protobuf golden sources live under
[`fixtures/desktop-first-slice-v1/agentteams`](../../scripts/orchestration-specs/fixtures/desktop-first-slice-v1/agentteams/control/v1/control.proto).
They are checked by `buf build` and admitted for the exact sandbox scope of
ADR-0103; shipping compatibility and deployment qualification remain separate.
Materialization moves each unchanged owned contract to its admitted feature;
TypeScript fixtures never become public DTO aliases.

## Identity and scope

Every mutating request has `requestId` plus the feature payload below. Canonical
authenticated tenant/project scope and server-selected `CommandDescriptor` complete
the idempotency identity. Target and client generation fence facade state and
handles; they never become runtime execution authority. Actor/member, grants and
delegation come from authenticated context, not tool arguments.

| Command descriptor | Feature payload | Durable result |
|---|---|---|
| `CreateTeam` | Bounded display name; one canonical Agent/profile-version reference; optional role key and default-coordinator reference | Team resource, immutable version, feature Operation |
| `CreateRun` | Exact Team version, registered Workspace reference, explicit immutable Run policy and context requirements | Run resource and feature Operation; readiness remains separate |
| `CreateTask` | Subject, description, project scope derived from context | Task resource and feature Operation, opaque ETag |
| `UpdateTask` | Task resource, subject/description field mask, explicit present values, expected opaque ETag | Same Task resource, successor ETag and feature Operation |
| `SendMessage` | Conversation reference, explicit direct recipient, bounded text, optional authorized Task reference and reply-to message | Immutable message resource, recipient delivery reference and feature Operation |
| `PlanWork` | Run resource, Task resource and expected Task ETag, exact Run participant | Run-owned planned WorkPlacement and feature Operation returning Run reference |
| `CancelRun` | Run resource and independently authorized cancellation reason | Run-owned cancellation Operation; technical stop remains runtime evidence |

MCP exposes `task_create`, `task_get`, `task_list`, `task_update`, `message_send`
and `message_list` for the bound Project/Run participant. Tool arguments never
carry credentials, trusted authorship, runtime fences or a provider-native task
ID. Team/Run creation stays a client control capability in this slice; a member
cannot spawn a second kernel through native TeamCreate/Task tools. Required MCP
registration and tool availability are runtime admission requirements.
The MCP host durably allocates a command UUID once per authenticated runtime
binding, RuntimeOperation and tool-call identity before first dispatch. It retains
the command identity and resolves response loss with the same owner. Model text
cannot select a different trusted principal or create a second receipt by changing
a transport retry. Runtime provenance, not a prompt-provided actor, binds the call. Failure
is typed before provider execution; SDK/native tools are not a fallback writer.

An authorized message commit records authorship, immutable content revision and
fixed recipient audience. Tool success means product commit only. It does not
claim runtime acceptance, read, acknowledgement or reply. Lifecycle completion
requires an explicit Work-owned command/evaluation; runtime text or a successful
provider result cannot complete a Task.

## Compatibility and versioning

Orchestrator baseline: `8b4f0ae1947fb21c3f9d2e232498a8917437426c`.
Desktop oracle: `07e7d8e0d44f4a3999e2693dfa2986d6b3819403`, read as immutable Git
objects; dirty worktree bytes are not admitted. Shared API SHA256 is
`d782050a63a34a870fce116d4c277e6d32706eb0fc4a2355e8713ee82b1332e7`;
shared Team DTO SHA256 is
`2df382683684850399e7581e32945d315c7b93943812cf505df096ed8ff0eef9`.

| Desktop IPC/DTO behavior oracle | New read/command owner and facade obligation |
|---|---|
| `TeamsAPI.createTeam`, `launchTeam`, `TeamCreateRequest` | Persist request/route before separate Team creation and Run activation; map `runId` to full saved Operation/Run identities |
| `getProvisioningStatus`, `onProvisioningProgress`, `TeamProvisioningProgress` | Operation plus readiness snapshot/feed; facade stores cursor separately from cursor-less callback |
| `cancelProvisioning`, `stop` | Authorized `CancelRun`; waiting cancellation never cancels business work |
| `createTask`, `getTask`, `updateTaskFields` | Work commands/query with ETag; no TeamTaskWriter for new Team |
| `sendMessage`, `getMessagesPage` | Conversation command and paginated read; preserve structured Task references and internal-message presentation |
| `getData`, `list`, `getTeamAgentRuntime`, `TeamAgentRuntimeSnapshot` | Team/Run projections with freshness and readiness evidence; process liveness is insufficient |
| `getMemberLogs`, task log/activity APIs, `onTeamChange` | Authorized Observation projection/feed, preserving chunks, `isMeta`, task/subagent filters; no transcript reader |

These are migration mappings, not a claim of byte-for-byte DTO qualification.
Raw `cwd`, `extraCliArgs`, `skipPermissions`, PIDs and pane IDs have no public
command equivalents: reject unsupported settings before acceptance or map them
through the existing trusted configuration boundary. Do not inherit the legacy
privilege default. Missing UI capability is explicit `UNSUPPORTED_CAPABILITY`.

Fork oracle commit is `969afc56ec39d92c33dd5aabd15ef782da94dd87` in
`777genius/agent_teams_orchestrator`. Tool blobs are TeamCreate
`19fd431bf62e104a55f43741a983805575136c2a`, TaskCreate
`2d82c8b7779fa31ac85df729aaf3b09ec675ba2c`, TaskUpdate
`2672e17df8a8765cc645ddc31afc0086963e106a`, SendMessage
`289f6a1809af37781f890e7b1289b597343b3822`. Their local file mutations are
behavior oracles only; never copy their writer into the MCP adapter.
The frontend capability matrix and Codex source manifest retain the full parity
backlog; this first slice neither supersedes them nor authorizes fork retirement.

## Delivery, ordering, and replay

Reads comprise paginated Team/Task/Conversation lists, immutable Run and readiness
snapshots, and authorized Activity views. Each snapshot returns its applied
watermark and resume cursor. Composite screens keep a vector of cursors for Work,
Conversation, Run readiness and Observation; there is no global merged cursor.
Each feed declares ordering scope, retention, event identity, bounds and gap
outcomes. Resume strictly after the snapshot watermark; deduplicate at least once
by feed and event identity. Expiry/gap requires a new authorized snapshot plus
explicit gap indication, not invented history or a filesystem lookup.

Run persists durable dispatch intent before calling runtime through its
consumer-owned port. Runtime command identity survives timeout/restart. Runtime
returns opaque session/operation references or an explicit unknown outcome;
Orchestrator never constructs them from a PID, name, provider session or path.
Control and output observations remain separate. Accepted runtime input, context
application and participant readiness remain distinct observations. Delivery
records cannot claim read or replied without the corresponding product evidence.

## Idempotency

Each owner commits its receipt, Operation, domain change and outbox in one local
transaction. Same scope/descriptor/request ID plus semantic fingerprint returns
the original retained outcome; different fingerprint returns `REQUEST_CONFLICT`
without an effect. Field ordering and transport encoding do not change semantic
fingerprints. Updates include ETag and field-mask semantics in the fingerprint.
Omitted and explicitly cleared fields differ. Exact revisions/counts remain
canonical strings across JSON, never authoritative JavaScript numbers.

Receipt lookup uses original scope/descriptor/request ID after a lost response;
full Operation name is persisted once observed. Current authorization applies
before exposing a retained receipt. The server supplies finite `resultExpiresAt` and
`reuseDetectionExpiresAt` in each Operation. ADR-0071 requires the latter to be
at least command `validUntil` plus clock-skew and recovery grace, and never before
the retained result expiry. Commands carry a finite `validUntil`; a request beyond
that deadline can resolve retained state but cannot create a fresh effect. During
tombstone retention resolution is `expired`; beyond it the expired command is
still invalid. No indefinite retention or new global product duration is chosen.
The test-only policy uses instants 100, 110 and 112 with skew 2 and recovery grace
10; these are deterministic fixture coordinates, not production duration defaults.
OD-029 remains owner of product retention outside this bounded test admission. Runtime has its own command ledger; product Operations never alias
RuntimeOperations.

The new Team receives a durable `NEW` route generation before first send. All
mutations, reads and subscriptions use it. Legacy Teams retain `LEGACY` ownership.
After acceptance or an unknown response, reconcile only with the recorded owner.
Rollback before admission requires proof of no accepted or unknown mutation.
After admission, stop/reconcile the new Run under the new owner before any future
route change; never replay its accepted commands through legacy.

### Exact transport and resources

Use Connect unary JSON, `POST {baseUrl}/{fullyQualifiedService}/{Method}`, with
`Content-Type: application/json` and `Connect-Protocol-Version: 1`. ProtoJSON is
the representation of the golden Protobuf, not an independent JSON contract.
Services are `agentteams.team_topology.v1.TeamsService`,
`agentteams.run_orchestration.v1.RunsService`,
`agentteams.work_coordination.v1.TasksService`,
`agentteams.agent_communication.v1.ConversationsService`,
`agentteams.execution_observation.v1.ActivityService`, and
`agentteams.control.v1.OperationsService`. Exact RPC methods and presence live in
the corresponding golden sources. The recovery method is
`ResolveCommandOutcome`, with `accepted`, `rejected`, `expired` and `notSeen` oneof
outcomes. No independent `ResolveRequest` alias is introduced.

The selected immutable main-owned Target holds `targetId`, `baseUrl`, canonical
tenant/project scope and a credential-provider reference. Main obtains a
short-lived audience-bound bearer token for that target; renderer receives no
credential. Synthetic authority is a test adapter bound to exactly one test
principal and Project and fails closed for other identities. It is not a new
auth provider or a qualified authentication deployment. Never send synthetic
authority to an advertised production target.

Resource grammar is `tenants/{tenant}/projects/{project}` followed by
`teams/{id}`, `teamVersions/{id}`, `agents/{id}`, `agentProfileVersions/{id}`,
`runs/{id}`, `participants/{id}`, `tasks/{id}`, `conversations/{id}`,
`messages/{id}`, `workspaces/{id}`, `runPolicySnapshots/{id}`, or
`contextManifests/{id}`. A version member uses
`teamVersions/{version}/members/{member}`. Policy snapshots are immutable Run-owned artifacts;
Context manifests are immutable Agent Context artifacts. Admission resolves
authorized exact versions in the same Project and never follows a mutable latest
reference or accepts a user-supplied hash as authority. All references must match authenticated
Project scope. Operation grammar remains ADR-0071, with registered `team`, `run`,
`work`, and `message` routing kinds. Descriptor values are `team.create.v1`,
`run.create.v1`, `run.cancel.v1`, `run.plan-work.v1`, `task.create.v1`, `task.update.v1`, and
`message.send.v1`. Caller `requestId` is lowercase UUIDv4. Clients persist full
names and never construct identities from display labels.

`UpdateTask` requires an ETag and a nonempty duplicate-free field mask restricted
to `subject` and `description`. Every masked field is explicitly present; every
present value is masked. Empty description is an intentional clear; absent value
is invalid; subject must remain nonempty. No lifecycle mutation is hidden in a
metadata command. Ordinary lists use live keyset pagination; initial/recovery
snapshots pin their watermark. Page tokens bind subject, scope, query and expiry.
A feed page signals gap explicitly and always returns a next cursor. Resource
change notifications cause authorized requery, never client-side business writes.
Activity snapshot preserves ordered block IDs, internal visibility, Task and
runtime-operation references, watermark, freshness and gap; protected payloads
are excluded. Activity absence is not success, readiness or Work completion. `TEXT_DELTA`
appends only a true incremental fragment. A cumulative provider/B text snapshot
maps to `TEXT_SNAPSHOT` and replaces the existing block with the same block ID;
`TEXT_COMPLETE` closes that block without appending its text a second time.
Never relabel cumulative text as a delta. Delivery evidence booleans are optional:
absent means unknown/unobserved, true means that fact was observed, and false is
only an explicit negative observation when its owning contract supports it.
A default false is never inferred from missing proof.

### Owner clock metadata

Operation `acceptedAt`/`updatedAt`, Team `createdAt`, Task
`createdAt`/`updatedAt`, and Message `recordedAt` come from
their owning transaction's explicit ExactInstant clock input. Run `createdAt`
maps progress start time; readiness and Activity `recordedAt` map update/log time.
Message `recordedAt` maps the legacy Inbox timestamp; no duplicate timestamp alias
is added for the same fact. These are owner-captured product/projection instants,
not a fresh Desktop `Date.now()`. They use
`google.protobuf.Timestamp` at the public boundary with exact epoch-microsecond
application values and microsecond-aligned nanos. Reject sub-microsecond inputs;
never silently round or generate replacement timestamps in Desktop. Negative
instants use floor-based seconds plus nonnegative nanos. ProtoJSON preserves six
fractional digits where present; codecs preserve the instant regardless of text
format. These metadata instants are not provider evidence, sequence numbers,
read/acknowledgement proof or cross-feed ordering authority.

### Team to Run discovery

`RunsService.ListRuns` requires Project parent plus exact `teamVersion`; its
paginated Run projection returns `observationRevision`, cursor and optional
`activeRun`. Run Orchestration supplies `activeRun` only when its current plan and
occupancy authority prove one matching active Run; it never means latest session,
latest timestamp or inferred provider activity. Zero active Runs leaves the field
absent. A stale/unknown projection is not current selection authority.

The facade persists the exact created/selected Run reference per Target and Team
version. It queries that Run after restart; for discovery it uses the authorized
Run list and its explicit active-Run projection or an explicit selection. It never
writes a mutable current-Run field into Team Topology. Team boards, messages,
readiness and Activity use the selected canonical Run, with no selection yielding
a typed selection-required/unavailable state rather than a project-wide query.

### Direct Conversation activation

After Run admission, the Run activation process stages one durable child command
to the Communication-owned internal `ensureDirectConversation` use case. Its
server descriptor is `conversation.ensure-direct.v1`; the child UUID is allocated
and persisted once with the activation process before dispatch. Inputs are the
exact Run reference, canonical Run participant and authenticated human audience.
Communication validates current authority even on receipt replay, fixes the direct
audience once, and commits Conversation, receipt and outbox in its own transaction.
Same identity/payload replays, changed payload conflicts; receipt expiry follows
the same finite validity/skew/recovery rule as other admitted commands.

The process stores only the returned opaque Conversation reference. `GetRun`
exposes it as optional `conversation` after authoritative commit. A pending,
failed or unknown child leaves Run activation partial/pending; required-message
readiness cannot become ready. `SendMessage` never implicitly creates a
Conversation or guesses an identity. Desktop and member binding obtain the ref
through the selected canonical Run. No public generic Conversation creation RPC
is introduced, and neither Run nor Host writes Communication tables.

### Task placement and read scope

Run Orchestration alone owns internal `WorkPlacement`. `PlanWork` validates the
current Run authority, exact participant and Task reference/ETag through a narrow
Work query port, then records a planned placement plus receipt/outbox locally.
It does not start a WorkExecution, change Work lifecycle, assign a Task owner or
dispatch runtime input. Actual execution admission remains the next explicit Work
slice. Repeated planning with the same request replays; conflicting Task scope,
stale ETag, participant or Run authority is rejected without placement.

The Desktop create-Task facade persists separate `CreateTask` and `PlanWork` child
identities. Placement failure leaves the created Task intact and surfaces the
partial outcome; it never deletes or duplicates the Task. Team boards query
`ListRunTasks` for the selected exact Run, then authorized Work snapshots for those
references. A project-wide Task list is never interpreted as Team membership.
`ListRunTasks.parent` is the Run resource; Work `ListTasks.parent` remains Project
scope for the separate project view. Feed filters bind exact Run or Conversation
where applicable; authorization and cursors cover the same filter. Unknown,
foreign, omitted or contradictory filters fail before returning records. Run
and Conversation read queries do not expose another Team's records merely
because Project scope is shared. Observation always requires an authorized Run.

### Run process and cancellation table

| Durable state and input | Next state and authority |
|---|---|
| Admitted plus activation intent | Activating; store child identities before dispatch |
| Activating plus current context/runtime/tool evidence | Active; readiness projection advances independently |
| Admitted/activating/active plus authorized cancellation | Cancelling; fence new product dispatch; commit runtime cutoff intent |
| Cancelling plus confirmed target stop | Cancelled; release occupancy only after runtime containment evidence |
| Cancelling plus unknown stop | Failed-unknown; retain occupancy, target references and cleanup obligation |
| Cancelling/cancelled plus late ready/output | Record safe evidence only; no reactivation or Work completion |
| Task created but planned placement fails | Keep Task and its receipt; report partial outcome; retry only same PlanWork identity after resolving its outcome |
| Team created but Run admission fails | Preserve Team; failed child Operation; no implicit deletion |
| Runtime acceptance response lost | Reconcile same command identity; no replacement session or replay |

Activation, dispatch/delivery and cancellation process state is feature-owned.
The in-process scheduler retries only its committed intent with stable identity.
A future Temporal workflow uses that process identity, application Activities,
versioned signals, timers and checkpoint queries; continue-as-new carries the
same command/cursor state. Scheduler state never replaces domain state or an
external receipt. Crash before commit has no intent; after commit before dispatch
resumes the durable intent; post-handoff uncertainty enters reconciliation.

## Errors and retryability

Before acceptance: validation, forbidden/revoked authority, stale ETag,
unsupported capability, invalid target or scope fail without effects. After
acceptance: expose durable Operation progress or typed failure. `OUTCOME_UNKNOWN`
requires lookup/reconciliation, not automatic replay of a provider handoff.
Transport reconnect may retry an idempotent command only with its original
identity inside its declared retention horizon. Read timeout cancels only the
wait. Stale generation/late target observations cannot update the current view.
Runtime stop uncertainty keeps occupancy and cleanup obligations unresolved.

## Security and redaction

Use accepted authority-provider, tenant isolation, context-owned persistence,
classification and controlled egress standards. Derive MCP principal from the
runtime-bound authenticated delegation; recheck grant/revocation on every call.
Never trust prompt authorship, payload tenant, transcript text or tool output as
control authority. Public errors contain bounded typed codes and safe references;
provider raw logs and payload remain protected Observation diagnostics.

## Conformance fixtures

The model exercises semantic request replay/conflict, authority before receipt
replay, stale edit CAS, seeded duplicate/restart sequences, unknown runtime handoff,
no legacy fallback and target/feed isolation. It does not prove storage atomicity,
a real MCP handler, Connect parity, SDK binary encoding, desktop UI or provider
execution. Later adapters must pass the same scenarios with actual transactions
and crash injection at pre-commit, post-commit and response-loss boundaries.

| Required readiness gate | Evidence contributed | Exact remaining production admission |
|---|---|---|
| 1: Run, Work, topology | Proposed single-member ownership, metadata-only Work and duplicate/stale/unknown fixtures | Root acceptance of scoped S3/S4 and metadata-only Task model under OD-006; cancellation/partial outcomes now specified below, real adapter conformance follows admission |
| 2: Communication and Context | Direct message authority/evidence separation; minimum immutable manifest | Record direct Conversation audience/delivery bounds under OD-026; explicit exclusion of Attention automation, group routing and external notifications |
| 3: SDK/Desktop | Exact oracle revisions, DTO mapping, route and replay model | Accept OD-010 slice; proposed feature Protobuf/resource/presence/expiry and minimal Observation sources now versioned; real direct SDK/Connect/facade conformance follows admission |
| 4: Durable processes | Stable activation/dispatch/cancellation identities; unknown reconciliation | Persist process checkpoints/outbox and prove crash matrix through in-process scheduler; future Temporal map retains those identities |
| 5: Deployment/authority | Existing server target, current authorization and target-generation fixture | Bind server authority and runtime test adapter under OD-012/OD-004; no profile qualification or local-device claim |

ADR-0103 accepts this exact scoped implementation contract under the owner's
A-F mandate after root technical review. The readiness document links scoped
exit evidence separately from the broad roadmap gates and deployment qualification. Accepted
ADRs are not silently rewritten. Product-visible decisions beyond that mandate
remain proposed under their named OD owners. No second permission request is
required merely to execute the already authorized bounded migration.

The concrete next implementation increment is Team persistence plus Run admission
and the Work/direct-message application commands against fake runtime, in the
reserved packages above. Feature contracts, actual MCP inbound handlers and
server composition follow the same accepted ownership. Then connect admitted
runtime C, public SDK/Connect and Desktop facade. The first synthetic integration
must create/edit one Task and commit a member message through those real handlers,
lose the response, restart and resolve one effect. Provider credentials are not
required for that synthetic acceptance. Real SDK execution and Desktop CDP E2E
remain separate evidence and cannot be reported complete from these fixtures.

## Deprecation plan

Remove each migrated legacy handler only after all callers, reads/subscriptions,
crash/recovery and UI fixtures pass with legacy readers unavailable for the new
Team. Preserve read-only archive disposition and existing legacy Runs. F remains
blocked until the complete A-F capability matrix has verified successors; neither
this admission proposal nor synthetic evidence permits deletion of the fork.
