---
id: research.team-creation-legacy-capability-inventory-2026-08-27
type: research
status: active
owner: migration/desktop
summary: Complete read-only inventory of legacy Team creation behavior and its proposed target ownership and delivery disposition.
related:
  - ADR-0016
  - ADR-0076
  - ADR-0100
  - ADR-0101
  - architecture.migration-boundary
  - architecture.sdk-transports
  - domain.contexts.team-topology
  - OD-006
  - OD-010
  - OD-011
  - OD-044
  - OD-045
  - OD-046
  - OD-047
---

# Team Creation Legacy Capability Inventory, 2026-08-27

## Question

Which user-visible capabilities surround Team creation in the legacy Desktop,
which target owner should receive each capability, and which ones belong in the
module pilot, the first product MVP, a later release, or migration code only?

This report is evidence and planning input. It does not accept the proposed Team
Topology model or resolve the open product decisions listed below.

## Sources and method

The audit was read-only. No agent command, runtime, terminal, provisioning flow,
or user project was opened.

```text
Legacy Desktop repository: 777genius/agent-teams-ai
Legacy main commit: f6afac73cced62d943a0e891ad08d7b8f88f802f

Target repository: agent-teams-ai/agent-teams-orchestrator
Target main commit: 81e6946bd4161b30e456965f09bcb7969ecd3cbb
```

The inventory inspected the legacy create dialog, draft storage, Team request
types, broad Teams API, import capability, roster editor, and their supporting
validation. The legacy code is a behavioral donor, not architecture authority.

## How to read the delivery plan

One giant MVP table would mix product scope, ownership, delivery order, and open
decisions. The plan therefore has three connected views:

1. **Capability ledger** records every legacy or newly requested user outcome.
2. **Delivery slices** show when coherent groups are built and what each slice
   intentionally excludes.
3. **Decision register** names the unresolved choices that implementation may not
   make implicitly.

The disposition vocabulary is stable:

| Disposition | Meaning |
|---|---|
| `MODULE_PILOT` | Implement only to prove the first feature/module shape |
| `MVP_REQUIRED` | Required for the first useful Create Team product release |
| `MVP_CANDIDATE` | Valuable in the MVP, but still needs an owner or scope decision |
| `LATER` | Preserve a clean extension seam, but do not implement in the first MVP |
| `MIGRATION_ONLY` | Preserve through the Desktop compatibility boundary, never as the target domain contract |
| `REJECT` | Do not reproduce the legacy behavior |

## Product capability ledger

### Draft and Team definition

| ID | User outcome and legacy evidence | Target owner | Disposition | Target shape or extension seam |
|---|---|---|---|---|
| TC-01 | Resume an unfinished create form. The legacy IndexedDB snapshot is versioned, has no TTL, and clears after successful creation. | Desktop client | `MVP_CANDIDATE` | Client-owned draft; never a Team aggregate or public control resource by default |
| TC-02 | Name and describe a Team with display name, description, and color. | Team Topology | `MVP_REQUIRED` | Small Team definition fields with server-side canonical validation |
| TC-03 | Reject invalid or conflicting Team names before mutation. Legacy UI sanitizes names and checks existing and provisioning names. | Team Topology | `MVP_REQUIRED` | Typed deterministic diagnostics; no UI-only invariant |
| TC-04 | Add, remove, order, and edit Team members before creation. | Team Topology | `MVP_REQUIRED` | Roster input whose final aggregate and concurrency boundary remains under OD-006 |
| TC-05 | Give a member a role and instructions. Legacy stores free-text role and workflow. | Team Topology | `MODULE_PILOT` | V1 checker accepts one optional opaque `roleKey`; richer role semantics remain a required follow-up |
| TC-06 | Select a persistent Agent from the user library. Legacy has no separate reusable identity; members are inline in each draft. | Team Topology | `MVP_REQUIRED` | ADR-0100 permits one current Team assignment per Agent; move is explicit and copy creates a new identity |
| TC-07 | Create an Agent inline and optionally save it for later use. This is a new request, not confirmed legacy behavior. | Team Topology plus client UX | `MVP_CANDIDATE` | `Save Agent` and `Link to Team` are separate observable commands; the first checker never creates a profile as a side effect |
| TC-08 | Use one participant as the default coordinator while preserving the ability to replace it for a Run. Legacy has a distinguished lead and can sync teammate runtime choices from it. | Team Topology and Run Orchestration | `MVP_REQUIRED` | ADR-0101 stores the default in Team history and resolves one ordinary effective coordinator in each Run plan |
| TC-09 | Create a solo Team. Legacy hides member controls and sends an empty member list. | Team Topology | `MVP_CANDIDATE` | Decide whether this is a Team with one implicit coordinator, an empty roster, or a separate client shortcut |
| TC-10 | Copy an existing Team into an editable new draft. | Team Topology plus client UX | `LATER` | Clone produces a new draft from an explicit source version; no shared mutable roster |
| TC-11 | Instantiate from a template or import a legacy Team folder. | Team Topology and migration/desktop | `LATER` | Template instantiation is domain-owned; legacy folder parsing stays in an anti-corruption adapter |

### Runtime and workspace choices

| ID | User outcome and legacy evidence | Target owner | Disposition | Target shape or extension seam |
|---|---|---|---|---|
| TC-12 | Select provider, backend, model, effort, and fast mode for the lead and members. | Agent Runtime profile owner; Team Topology stores only opaque product references | `MVP_CANDIDATE` | No provider enum, binary path, credential, or raw runtime DTO in Team Topology |
| TC-13 | Inherit runtime choices from the lead or override them per member. | Client UX and Run admission policy | `LATER` | Resolve effective immutable Run inputs; do not mutate reusable profiles implicitly |
| TC-14 | Configure permission bypass, context limit, local-model override, MCP policy, and raw CLI arguments. | AR, Runtime Security, and migration/desktop | `MIGRATION_ONLY` | Typed capabilities may replace justified settings; raw flags never enter Team domain or the public SDK |
| TC-15 | Choose a project or custom working directory and remember recent projects. | Workspace Registry and client UX | `MVP_CANDIDATE` | Team references a product workspace identity; concrete filesystem paths remain deployment-specific |
| TC-16 | Validate workspace trust and Git readiness. | Workspace Registry, Access Control, and client adapters | `LATER` | Separate readiness queries and typed evidence; no Team mutation side effect |
| TC-17 | Request a Team or member worktree. | Workspace Registry and Run Orchestration | `LATER` | Run-scoped allocation intent; no raw worktree name as Team invariant |

### Readiness, creation, placement, and activation

| ID | User outcome and legacy evidence | Target owner | Disposition | Target shape or extension seam |
|---|---|---|---|---|
| TC-18 | Preview whether a Team draft is structurally valid without changing state. | Team Topology | `MODULE_PILOT` | `CheckTeamDraft`, deterministic and side-effect-free |
| TC-19 | Check provider installation, authentication, selected models, and runtime compatibility before launch. | AR publishes technical evidence; Run Orchestration derives product readiness | `LATER` | Capability-specific evidence with freshness and binding identity |
| TC-20 | Help reconnect or configure a provider when readiness fails. | AR or future Runtime Setup client journey | `LATER` | Explicit user action outside Team creation; never hidden inside validation |
| TC-21 | Save a Team without launching it. Legacy `createConfig` proves this is a real independent user outcome. | Team Topology | `MVP_REQUIRED` | Durable `CreateTeam` after the module pilot and Team model decisions |
| TC-22 | Optionally place the created Team into an organization. Legacy performs best-effort placement after create-only. | Agent Organization | `LATER` | Independent command and outcome; failure never rolls back a committed Team |
| TC-23 | Create a Team and immediately start it. Legacy `createTeam` returns a `runId`, combining several owners. | Run Orchestration `team-activation` feature | `LATER` | Durable activation process defined by ADR-0076; Team Topology does not launch agents |
| TC-24 | Disable or replace a Team member for one Run without rewriting the saved Team. This is a new requested capability. | Run Orchestration | `LATER` | ADR-0101 requires the source Team version, typed override, and materialized effective roster in the immutable Run plan |
| TC-25 | Use the same Agent in two concurrently active Teams or Runs. This is a new requested capability. | Run Orchestration | `REJECT` | ADR-0100/ADR-0101 require an explicit copy with a new identity and separate statistics |

### Operation feedback and broader Team lifecycle

| ID | User outcome and legacy evidence | Target owner | Disposition | Target shape or extension seam |
|---|---|---|---|---|
| TC-26 | Observe launch progress and current status. Legacy exposes timestamps, text, PID, CLI logs, assistant output, and diagnostics. | Run Orchestration, Execution Observation, and migration/desktop | `LATER` | Typed operation and feed; PID and raw logs remain protected migration projections |
| TC-27 | Cancel provisioning. | Run Orchestration for product cancellation; AR for technical cancellation | `LATER` | Typed accepted, terminal, unsupported, or outcome-unknown semantics |
| TC-28 | Diagnose launch failure and open the existing Team after a name conflict. | Feature owners plus Desktop projection | `LATER` | Safe typed diagnostics and resource links; no raw secret-bearing output |
| TC-29 | List, open, delete, restore, and permanently delete Teams. | Team Topology plus retention/security policy | `MVP_CANDIDATE` | Separate lifecycle capabilities; permanent erasure remains gated by retention policy |
| TC-30 | Use Team messages, tasks, activity, logs, and runtime snapshots after creation. The broad legacy `TeamsAPI` groups these together. | Agent Communication, Work Coordination, Execution Observation, and clients | `LATER` | Separate feature APIs; similar UI placement does not create Team Topology ownership |

## Delivery slices

| Slice | User-visible proof | Included | Explicitly excluded | Exit evidence |
|---|---|---|---|---|
| S0 - Evidence and admission | Contributors can see the full legacy map and unresolved product choices. | This inventory, linked open decisions, exact source revisions | Product code and package materialization | Documentation checks and owner review |
| S1 - Check Team Draft core | A trusted in-process caller receives deterministic typed diagnostics for a minimal draft. | Team name, bounded member list, member identity within the draft, one optional `roleKey`, stable diagnostic codes | Database, profile creation, placement, AR calls, launch, transport, GraphQL | Domain/application tests and module-boundary conformance |
| S2 - Public check capability | Node SDK callers invoke the same checker through the accepted public route. | Handwritten capability SDK, feature-owned Protobuf, Connect inbound adapter, mapping and behavior conformance | Persistence, durable Operation, runtime readiness, GraphQL | In-process and Connect adapters pass the same fixtures |
| S3 - Persistent Team | A user creates, gets, and lists durable Team definitions. | Context-owned persistence, authorization, concurrency, immutable or revisioned roster semantics | Run activation and provider execution | Accepted Team boundaries plus repository and API tests |
| S4 - Team activation | A user starts a Run from a selected Team and observes partial outcomes. | Run snapshot, optional run overrides, placement policy if selected, AR capability ports, operation/feed semantics | Hidden dual writes and raw provider controls | Cross-context and failure-mode qualification |
| Later - Rich collaboration | Teams support richer coordination, reusable roles, templates, import, lifecycle, and observations. | Only capabilities promoted by real user evidence | Universal workflow or hierarchy framework built in advance | Separate feature admission and acceptance evidence |

S1 and S2 are the accepted two-increment module pilot. They intentionally prove a
real vertical capability without prematurely choosing persistence or execution
semantics. S3 and S4 are separate product increments.

## Remaining decision register

ADR-0100 and ADR-0101 resolved reusable identity, exclusive current Team
assignment, exclusive active Run occupancy, Run-only roster overlays, and the
default-plus-override coordinator model. The following choices still are not
implementation details:

1. What exact tenant/project scope and public resource name does the Agent library
   use under OD-019?
2. Which Agent and Team aggregate boundaries and collection limits satisfy
   OD-006 and OD-011?
3. Is the legacy solo-Team toggle a true domain concept or only a draft shortcut?
4. Which lifecycle operations are required for the first useful MVP after
   `CreateTeam`?
5. Which Work, Conversation, approval, and cancellation commands a coordinator
   may request after the owning authorization decisions are accepted?

Until these are resolved, S1 may validate only the minimal draft structure. It
must not persist a one-off model that makes the later answer expensive to change.

## Evidence anchors

- `src/shared/types/team.ts:1470` defines each legacy member inline with role,
  workflow, workspace isolation, provider, model, effort, fast mode, and MCP
  policy.
- `src/shared/types/team.ts:1505` combines Team metadata, roster, workspace,
  runtime, permission, worktree, and raw CLI settings in one create request.
- `src/shared/types/team.ts:1551` returns a Run identity from Team creation,
  confirming the legacy ownership mix.
- `src/shared/types/team.ts:1594` exposes cursor-less launch progress including
  process and raw diagnostic details.
- `src/shared/types/api.ts:515` begins the broad legacy `TeamsAPI`; create-only,
  launch, cancellation, messages, tasks, logs, and lifecycle share one facade.
- `src/renderer/services/createTeamDraftStorage.ts:30` owns the versioned local
  draft snapshot, and line 205 defaults to create-and-launch.
- `src/renderer/components/team/dialogs/CreateTeamDialog.tsx:1997` assembles the
  mixed create request.
- `src/renderer/components/team/dialogs/CreateTeamDialog.tsx:2319` separates the
  create-only UI path, followed by best-effort organization placement.
- `src/main/services/team/provisioning/TeamProvisioningPromptBuilders.ts:840`
  gives the legacy lead durable roster context, and line 923 makes delegation the
  default lead behavior in a non-solo Team.
- `src/main/services/team/provisioning/TeamProvisioningPromptBuilders.ts:769`
  lets the lead assign or reassign task ownership but line 774 forbids completing
  another member's work on their behalf.
- `src/main/services/team/provisioning/TeamProvisioningCrossTeamRelayHelpers.ts:81`
  routes a Team-addressed cross-Team recipient to `team-lead`.

## Completeness check

The inventory covers every field in `TeamCreateRequest`, every member field in
`TeamProvisioningMemberInput`, every create/provisioning method in `TeamsAPI`,
the create dialog's persisted draft, create-only and create-and-launch branches,
organization placement, copy/import behavior, and the adjacent Team lifecycle
methods exposed by the same legacy facade.

It intentionally does not enumerate every message, task, log, notification, or
terminal sub-operation because TC-30 routes those complete feature families to
their own owners. Their detailed migration inventories belong with those
features, not in the Create Team contract.

## Limitations

- Source inspection proves implemented paths, not current product usage rates.
- No legacy flow was executed and no real project was touched.
- Reusable Agent identity, exclusive membership and occupancy, Run roster
  overrides, and replaceable coordination are new accepted product requirements
  rather than legacy behavior.
- Remaining delivery details stay subject to the open product decisions and
  accepted readiness gates.
