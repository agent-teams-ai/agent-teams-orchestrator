---
id: ADR-0111
type: adr
status: accepted
owner: architecture/domain
summary: Allow equal joint Task execution and multi-Team human participation, and distinguish Execution Directory from the UI Workspace.
approved_by: product-owner
accepted_at: 2026-10-22
related:
  - ADR-0028
  - ADR-0062
  - ADR-0066
  - ADR-0072
  - ADR-0100
  - ADR-0101
  - ADR-0103
  - OD-006
  - OD-012
  - OD-019
  - OD-023
  - OD-027
  - OD-032
  - OD-048
  - domain.contexts.work-coordination
  - domain.contexts.workspace-registry
---

# ADR-0111: Human Collaboration and Execution Directory Terminology

## Context

On 2026-10-22 the product owner confirmed that a human may belong to several
Teams and needs one personal queue of accessible Tasks. The owner also described
two people solving the same Task as equals and explicitly delegated the remaining
assignment-model choice. The earlier single-accountable-assignee recommendation
would impose a responsibility hierarchy that this collaboration does not need.

The owner selected Execution Directory as the technical execution-resource name
while retaining Workspace in the UI. This resolves a terminology collision
without reopening ADR-0062's registration, materialization, or isolation model.

The same discussion confirmed that dangerous actions will require approvals and
asked to defer their detailed design. Taking a Task and approving an external
effect are separate decisions. The existing Work completion and AR permission
boundaries already distinguish their authorities.

## Decision

### Human participation and personal work

A human may belong to multiple Teams. One authorized personal-work query presents
Tasks across those memberships while retaining each Task's canonical tenant and
Project scope. Several membership paths do not duplicate a Task. A selected or
preferred Team is a UI preference, not an exclusive-membership invariant.

Human identity remains distinct from an Agent profile, Agent definition version,
and AR runtime identity. Human manual work requires no runtime activation,
session, occupancy, or fabricated heartbeat. ADR-0100's one-current-Team rule for
Agents and ADR-0101's Agent Run occupancy remain unchanged.

Membership, organizational placement, Task assignment, and the personal queue do
not independently confer access. Reads and commands require current authority
for their actual scope. Removing access blocks subsequent use even if historical
membership or assignment evidence remains.

### Equal executors of one Task

A Task has zero or more distinct active executor assignments. Zero means
unassigned. The finite set has an explicit contract limit; its numerical value
is left to the tactical design. A canonical scope-qualified human or Agent
reference defines uniqueness. The same person in two Teams is one executor of
that Task.

All assigned executors perform the work as equals and see the same Task in their
authorized personal work. No coordinator is mandatory. Reviewers, watchers and
approvers remain separate relationships. Independent deliverables may use
separate Tasks, but two people jointly producing one result need no artificial
subtasks or subordinate collaborator status.

The initial assignment policy is immediate authorized assignment:

- Adding an executor checks the authenticated actor, any delegation, assignment
  authority, current target eligibility, and declared Task, Project or Team
  restrictions. Agent model output cannot authorize the command.
- Self-claim adds the authenticated subject while preserving other executors.
  It requires explicit self-assignment authority and current eligibility; read
  access or a preliminary availability query alone is insufficient.
- Release removes the authenticated executor. Removing the last executor leaves
  the Task unassigned without cancelling, completing or reopening it.
- Reassignment explicitly names an executor to remove and a target to add in
  one atomic change. Other executors remain assigned. Exact command names and
  wire representations remain open.
- Changes use the expected Work revision, command idempotency and Work-owned
  transaction and outbox. Only one conflicting change can commit against that
  revision. A stale claimant may reload and retry to join the updated set.
  Duplicate identities do not create duplicate assignments. Retried outcomes
  remain subject to current disclosure authorization.

There is no mandatory offer/acceptance workflow. Optional offers require their
own future semantics and cannot be represented as execution-status columns just
to reuse a board. Assignment never activates an Agent, reserves Run occupancy,
or satisfies runtime readiness.

### One Work lifecycle and completion authority

ADR-0072 and ADR-0066 remain authoritative: Work Coordination alone commits the
Task's terminal outcome, and the first valid revision-checked terminal commit
wins. Assignment does not itself grant permission to complete.

An authorized executor may request completion. Work applies the pinned completion
plan and required evidence. A simple manual plan can accept one authorized
executor or separately authorized manager's request without waiting for all
executors to accept or mark themselves finished. Multiple executors imply no
individual completion state machine or unanimity rule.

An assignment change is not automatically material rework. A future completion
plan that depends on the executor set must pin the relevant identities and
define candidate invalidation when that set changes. Configurable gate details
remain in OD-027. Runtime exit, a board move, or an individual's contribution
indicator cannot independently complete Work.

### Execution Directory and Workspace

**Execution Directory** names the managed project-scoped filesystem resource used
for agent execution. It includes shared directories, worktrees, clones, snapshots
and remotely materialized filesystem views. It does not require a local directory
or make an arbitrary caller-supplied path authoritative. Identity and
materialization references remain opaque.

**Workspace** remains the UI collaboration, navigation or saved-view term over
authorized scope. It creates no additional membership owner, Task store,
security boundary, or parent of Project identity. Any future independent
Workspace lifecycle must be justified and decided under OD-019.

This decision supplements ADR-0062 and preserves its model identities:

- `WorkspaceRegistration` owns the registered binding and generation.
- `ExecutionWorkspaceAllocation` remains a distinct resource with a declared
  sharing scope, normalized guarantees, lifecycle and cleanup state.
- `WorkspaceAccessAndConsistency` remains separate from runtime-isolation
  requirements.

Workspace Registry retains registration, materialization, release and uncertain
cleanup reconciliation. Run Orchestration consumes opaque references. Current
product authority determines allowed use; Policy and Risk determines required
properties; AR owns runtime enforcement. A worktree, clone, snapshot or separate
directory is not proof of a security sandbox.

The terminology selection does not rename public resources, APIs, packages,
catalog IDs, code identifiers, stored records or wire fields. Exact public
spelling and any migration remain in OD-019. Existing owners and accepted
decision bodies remain unchanged.

### Dangerous-action approvals remain a separate design

Dangerous actions will require product approval. Assignment acceptance, scoped
authorization, product approval, AR technical permission and Work completion
remain distinct. Taking a Task does not authorize every action needed to carry
it out.

OD-032 owns the deferred research into eligible approvers, action and argument
binding, expiry, revocation, dispatch races and enforcement. ADR-0028's selected
human or machine authority remains possible; this record does not mandate human
approval for every assignment or action. It accepts no detailed approval model,
shared approval aggregate, wire contract or new service.

### Admission and remaining decisions

This is a product-policy and terminology decision. It does not widen ADR-0103's
metadata-only Task implementation admission or activate mixed Team membership,
assignment, completion, approval, or filesystem capabilities.

OD-048, OD-006 and OD-019 retain exact human and Agent references, successor
TeamMember and roster contracts, command shapes, aggregate/storage boundaries,
assignment-set limits, terminal-Task assignment edits, eligibility and
deprovisioning/reassignment recovery, and their executable qualification. Human
contributions to Run completion remain separate from Task assignment. OD-023
retains organization-structure details; OD-027 retains configurable completion
semantics; OD-032 retains dangerous-action approval design.

Platform consumes Orchestrator-owned contracts through APIs/SDKs. It may present
this collaboration model but does not implement a second Task, assignment or
completion authority. Standalone Orchestrator retains the same capabilities
without a mandatory commercial Platform dependency.

## Consequences

- Small Teams can assign joint work without configuring offers, coordinators or
  per-executor completion workflows.
- Multiple memberships and joint work share one Task identity and current access
  checks across personal, board, list and other views.
- A set of executors needs explicit bounds, deduplication, concurrent mutation
  rules and offboarding reconciliation. The tactical slice must qualify them.
- Completion remains deterministic while allowing later plan-specific evidence
  without making every joint Task a quorum workflow.
- UI and filesystem terminology become distinct without a speculative public
  resource migration or altered runtime isolation ownership.
- Confirmed product policy is discoverable now; production behavior still needs
  the owning contracts, accepted admission and conformance evidence.

## Rejected alternatives

- One mandatory accountable assignee plus subordinate executing collaborators:
  viable for explicit escalation ownership, but imposes a hierarchy the requested
  equal collaboration does not need and still needs collaborator queries.
- Multiple assignees coupled to mandatory offers and unanimous completion:
  cardinality does not require these independent workflows.
- Automatically applying Agent one-current-Team or runtime occupancy rules to
  people: prevents useful human collaboration without protecting Agent runtime
  invariants.
- Execution Environment as the filesystem name: implies process or network
  ownership that belongs to AR.
- Renaming all existing Workspace identifiers immediately: terminology approval
  does not define the exact public contract and migration surface.

The dated [collaboration research](../research/collaboration-hierarchy-and-workspace-review-2026-10-22.md#later-owner-decisions-and-critic-review)
and [OD-048 comparison](../open-decisions/OD-048-mixed-human-and-ai-team-participation.md#planning-alternatives)
record scoped estimates, uncertainty and comparative engineering judgments.
