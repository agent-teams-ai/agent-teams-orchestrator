---
id: OD-048
type: open-decision
status: open
owner: architecture/domain
summary: Define mixed human and AI team membership, Work assignment, and separate AI execution eligibility.
related:
  - ADR-0072
  - ADR-0100
  - ADR-0101
  - ADR-0103
  - ADR-0111
  - OD-006
  - OD-011
  - OD-012
  - OD-019
  - OD-023
  - OD-026
  - OD-027
  - OD-032
  - domain.contexts.team-topology
  - domain.contexts.work-coordination
  - domain.contexts.run-orchestration
---

# OD-048: Mixed Human and AI Team Participation

## Decision required

Finish the exact identity, command, aggregate, persistence, and execution-selection
contracts for the product policy accepted by
[ADR-0111](../decisions/0111-human-collaboration-and-execution-directory-terminology.md).
Preserve existing Agent identity and occupancy invariants without treating people
as runtime agents. This record remains open for those tactical gates.

## Confirmed product direction

The product owner confirmed on 2026-10-21 that people and AI agents should
collaborate in the same visible Teams and work with the same Task system.
An authorized agent may create or assign manual work to a person. People may
create work and claim it for themselves when policy permits. A person performs
manual work without being started as a process; an AI participant may require
separate activation before executing its work.

Tasks support multiple views: board, list, calendar, timeline, personal work,
and future projections. Kanban is one presentation, not the domain model.

On 2026-10-22 the owner selected multiple human Team memberships and one unified,
authorized personal-work query, and delegated the remaining assignment policy
choice. ADR-0111 accepts zero or more equal Task executors, immediate authorized
assignment, and no mandatory coordinator, assignment offer, or executor quorum.
Several people may jointly produce one result through one Task; independent
deliverables may be split into Tasks when useful.

The accepted product policy does not extend ADR-0103's current implementation
admission. Existing TeamMember and Run roster contracts are Agent-specific.
Their exact successor contracts and the excluded Work assignment slice require
tactical contracts and qualification before implementation.

## Constraints

- Team Topology owns saved Team composition. Work Coordination owns Task
  assignment and lifecycle. Run Orchestration owns AI execution admission,
  activation, and occupancy. No shared transaction crosses these owners.
- A human principal, organization membership, AgentProfile, Team member,
  assignee, Run participant, and runtime session are distinct identities.
  A person is not an AgentProfile with a human provider.
- Human references resolve through the selected product authority. A new
  mandatory HumanProfile aggregate or Platform dependency is not implied.
- AgentProfileId is a business reference, not a credential. Agent commands
  carry independently authenticated actor, subject/delegation, tenant/project,
  and relevant grant facts. Model output text alone never assigns a Task.
- Team membership, coordinator selection, department placement, and Task
  assignment do not automatically confer product permissions or approve a
  dangerous action.
- Agent membership retains ADR-0100's one-current-Team rule and immutable
  definition-version pins. That rule does not automatically constrain humans.
- Work may exist before, during, and after a Run. Assignment does not itself
  start an agent. Failed activation does not delete the Task or saved Team.
- Manual human work requires no AR session, runtime binding, provider readiness,
  Agent occupancy, or fabricated heartbeat.
- AI activation selects typed Agent references from an exact source Team
  version. A mixed Team does not silently make human availability part of
  Run readiness, completion, quorum, or cancellation.
- Work-owned completion policy remains authoritative. Runtime exit, board
  movement, and a message saying work is done are not independent completion
  authorities.
- Every membership and assignment is scope-qualified. Email, display name,
  filesystem path, and an unqualified provider subject cannot define identity.

## Accepted product policy

### Human membership

One person may belong to multiple Teams. A UI may retain a last-selected Team or
an optional primary Team preference without making it an exclusive membership.
One personal-work query joins only currently authorized Task projections across
those memberships. It preserves each Task's tenant and Project identity and
deduplicates one Task reached through several memberships. It does not move Tasks
out of their owning Projects or create another assignment store.

### Joint execution and assignment

A Task has zero or more distinct, equal executor assignments. Zero means
unassigned. The assignment set is bounded; its exact numerical limit remains a
tactical contract choice. Uniqueness uses a canonical scope-qualified human or
Agent reference, so the same person in several Teams has one assignment to a
Task. All real executors receive that Task in their authorized personal work.
Reviewers, watchers, and approvers are separate relationships. A coordinator is
not mandatory, and joint work does not require artificial subtasks.

- An authorized assignment adds an eligible executor immediately. Actor, target,
  delegation, current project eligibility, and any declared Task or Team
  restriction are checked independently. Read access alone is insufficient.
- Self-claim adds the authenticated subject to the executor set, preserving its
  other members. It requires explicit self-assignment authority and the same
  target-eligibility checks; it creates no offer to oneself.
- Release removes the authenticated executor. Removing the last executor leaves
  the Task unassigned without completing, cancelling, or reopening it.
- Reassignment explicitly removes a named executor and adds an eligible target
  atomically, preserving other executors. Exact command names and wire shapes
  remain open; a generic reassignment must not silently replace the whole set.
- Changes use the expected Work revision, command idempotency, and Work-owned
  transaction and outbox. Only one conflicting change commits against a given
  revision. A stale claimant may reload and retry to join the updated set; this
  is not a one-executor invariant. Duplicate identities cannot create duplicate
  assignments, and repeated commands retain their safe authoritative outcomes.
- Assignment does not grant continuing access. Revocation blocks subsequent
  reads and commands even when historical assignment evidence remains. Exact
  removal and reconciliation procedures remain open; they cannot silently
  reassign or complete the Task.

### Completion and execution

Work Coordination retains one Task lifecycle and completion authority under
ADR-0072 and ADR-0066. Assignment alone does not grant completion permission.
An authorized executor may request completion; Work applies the pinned plan and
its required evidence. A simple manual plan can accept a request from one
authorized executor or separately authorized manager without collecting every
executor's acceptance or completion vote. No implicit all-executor quorum or
individual completion lifecycle is introduced.

An assignment change is not automatically material rework. If a future completion
plan depends on the executor set, its candidate must pin the relevant identities
and define invalidation when that set changes. Exact configurable gates remain
under OD-027. Runtime exit, a board move, or a personal contribution indicator
cannot independently complete Work. Assignment neither starts an Agent nor
reserves occupancy; human work needs no Run or runtime session.

## Planning alternatives

The following alternatives explain the selected policy. They are engineering
judgments, not measured probabilities, uptime, or completed implementation.
Complexity 10 means harder.

### Human membership comparison

| Option | Confidence /10 | Complexity /10 | Expected reliability /10 | Additional production TypeScript lines |
|---|---|---|---|---|
| Multiple human Team memberships; one personal work query | 9 | 4 | 9 | 800-1,800 |
| One exclusive human Team; explicit temporary collaboration exceptions | 4 | 5 | 7 | 700-1,600 |

Multiple human Team memberships are selected. The exclusive option complicates
matrix organizations and temporary collaboration without protecting the separate
AI occupancy invariant. These membership estimates assume existing identity,
authority, membership, and query primitives; they exclude UI, tests, generated
code, provider implementation, and infrastructure. Estimate confidence is 4/10.

### Assignment comparison

The earlier comparison coupled multiple assignees with mandatory joint
acceptance/completion and therefore overstated the cost of cardinality alone.
Several equal executors do not require either additional workflow. The selected
policy gives real co-executors the same Task without imposing a hierarchy.

| Option | Confidence /10 | Complexity /10 | Expected reliability /10 | Handwritten production TypeScript lines |
|---|---|---|---|---|
| Selected: equal executors, immediate authorized assignment, ordinary Work completion plan | 9 | 5 | 9 | 3,000-6,000 |
| One accountable assignee plus executing collaborators in personal work | 6 | 6 | 8 | 3,000-6,500 |
| Multiple executors with mandatory offers, individual completion, and joint quorum rules | 5 | 8 | 7 | 5,000-10,000 |

The accountable-assignee option still needs real collaborator queues and
permissions, while adding coordinator replacement and responsibility rules.
The richer joint option is available only after a demonstrated need and its own
accepted semantics. An optional assignment offer concerns willingness to take
work; it is separate from Work lifecycle and dangerous-action approval.

Assignment ranges cover domain/application behavior, consumer-owned authority
checks, revision/idempotency integration, one persistence adapter and migration,
outbox/public-contract mappings, and handwritten API/SDK changes over existing
Task, identity, authority, and transaction infrastructure. They exclude UI,
tests, generated code, authority-provider implementation, infrastructure
foundations, notifications, Agent activation, and a general offer/quorum engine.
Estimate confidence is 3/10. The ranges overlap and must not be added to the
membership comparison as independent module budgets without scope review.

## Dangerous-action approval: separate unresolved design

Immediate Task assignment neither approves a dangerous action nor grants
technical execution permission. [OD-032](OD-032-last-mile-side-effect-safety.md)
retains the unresolved product approval and last-mile safety design, with
Approval Management's strategic boundary under OD-011 and exact approval/grant
aggregates under OD-006. Required-action policy, eligible approvers and
delegation, exact action/payload/scope binding, one-shot versus reusable approval,
expiry/revocation, final authority rechecks, retries/unknown outcomes, and audit
evidence remain explicit design work. Technical runtime permission and sandbox
enforcement stay with `ar`. This assignment decision does not resolve them.

## Ownership and remaining tactical contracts

Team membership uses a typed subject: either an Agent reference with its exact
definition version, or a provider-neutral human principal reference. Public
field names and aggregate boundaries remain open under OD-006 and OD-019.
Immutable historical composition is distinct from current membership authority.

AI execution consumes the Agent portion through an explicit selection contract.
Human work and approvals may coordinate with a Run through typed Work/process
contracts without inventing a human runtime lifecycle. Making a human a voting
or required Run participant is a separate product decision.

Organization structures under ADR-0044 arrange project-qualified Team references.
They do not recursively expand executable rosters. Cross-tenant and independent
installation cooperation remain future work in OD-023.

Platform consumes these Orchestrator-owned collaboration capabilities through
API/SDK contracts. Its [boundary direction](https://github.com/agent-teams-ai/agent-teams-platform/blob/main/docs/architecture/platform-orchestrator-boundary.md)
records the hosted relationship and future cross-customer limits. The
[collaboration review](../research/collaboration-hierarchy-and-workspace-review-2026-10-22.md)
preserves the comparison evidence and remaining product questions without
selecting exact contracts here.

Remaining gates include public identity and command shapes, assignment-set
bounds and storage/aggregate boundaries, policy eligibility rules, terminal-Task
assignment edits, active-work reassignment and deprovisioning recovery, and
qualification of the API/SDK and authority adapters. Optional assignment offers,
executor-dependent completion gates, and human Run participation require their
own explicit semantics; they are not implied by equal Task assignments.

## Acceptance criteria

- A mixed Team can display people and agents without conflating their identity,
  authority, versioning, or execution state.
- Multiple human Team memberships and the unified authorized personal-work query
  are qualified independently from Agent one-current-Team and one-active-Run
  occupancy.
- An authorized agent can request manual human work through the same owning
  application commands available to other clients; insufficient or revoked
  delegation rejects the command.
- Human self-claim requires explicit authority and current task-scope eligibility.
  Concurrent assignment changes use the expected Work revision, command
  idempotency, and authoritative transaction. One conflicting revision change
  wins; a stale claimant can retry to join existing executors. A preliminary
  availability query cannot grant the claim.
- Actor and assignee remain distinct in authorization and audit. A target is
  currently eligible in the correct project; membership removal cannot leave
  unexplained effective access.
- Immediate assignment, release, atomic named-executor replacement, and
  deprovisioning each have explicit transition results and recovery policy.
  Removing the last executor leaves unassigned Work; other executors remain
  intact during release and reassignment.
- Human-only Tasks work without an active Run. Starting, failing, or stopping
  an agent does not silently complete, delete, or reassign those Tasks.
- A Task has one authoritative lifecycle and executor set across every saved view.
  A personal work query filters each source by current access and preserves
  tenant/project identity in links, cursors, and commands. Multiple membership
  paths cannot duplicate its Task or executor identity.
- No mandatory coordinator, assignment acceptance offer, or completion quorum is
  inferred from joint assignment. Work's completion plan and independently
  checked permissions remain authoritative. Assignment grants neither access
  nor dangerous-action approval.
- Historical Team and Run versions remain immutable. Human inclusion in a Run
  cannot silently weaken required Agent version, activation, or occupancy checks.
- Standalone Self-Hosted and managed deployments expose the same collaboration
  capabilities through their independently configured authority adapters.

## Resolution

Partially decided by ADR-0111: human multi-Team membership, one authorized
personal-work query, zero or more equal executors, and immediate authorized
assignment are accepted product policy. This record remains open for the named
tactical contracts, qualification, and any human contribution to Run completion.
No production capability is admitted by this record; ADR-0103's scope is unchanged.
