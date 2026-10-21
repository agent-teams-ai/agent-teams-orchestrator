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
  - OD-006
  - OD-011
  - OD-012
  - OD-019
  - OD-023
  - OD-026
  - OD-027
  - domain.contexts.team-topology
  - domain.contexts.work-coordination
  - domain.contexts.run-orchestration
---

# OD-048: Mixed Human and AI Team Participation

## Decision required

Specify mixed Team membership, human assignment and self-assignment, and the
selection of AI execution participants without treating people as runtime
agents. Preserve the existing Agent identity and occupancy invariants while
deciding the new human-specific semantics.

## Confirmed product direction

The product owner confirmed on 2026-10-21 that people and AI agents should
collaborate in the same visible Teams and work with the same Task system.
An authorized agent may create or assign manual work to a person. People may
create work and claim it for themselves when policy permits. A person performs
manual work without being started as a process; an AI participant may require
separate activation before executing its work.

Tasks support multiple views: board, list, calendar, timeline, personal work,
and future projections. Kanban is one presentation, not the domain model.

This is confirmed product direction, not an extension of ADR-0103's current
implementation admission. The existing TeamMember and Run roster contracts are
Agent-specific. Their exact successor contracts and the excluded Work assignment
slice need accepted semantics before implementation; this open record does not
silently change them.

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
  assignment do not automatically confer product permissions.
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

## Options

### Human membership

The leading option permits one person in multiple Teams, while the UI can retain
a last-selected Team or an optional primary Team preference. The personal work
view joins only authorized Task projections across those memberships; it does
not move Tasks out of their owning projects or create another assignment store.

| Option | Confidence /10 | Complexity /10 | Expected reliability /10 | Additional production TypeScript lines |
|---|---|---|---|---|
| Multiple human Team memberships; one personal work query | 9 | 4 | 9 | 800-1,800 |
| One exclusive human Team; explicit temporary collaboration exceptions | 4 | 5 | 7 | 700-1,600 |

The second option complicates matrix organizations and temporary collaboration
without protecting the AI occupancy invariant. The recommendation is the first;
human cardinality is not yet accepted as an implementation contract.

### Assignment responsibility

The leading first slice has one accountable assignee, with collaborators,
watchers, and reviewers as different relationships. Shared participation does not
require multiple equal owners of the Task's completion.

| Option | Confidence /10 | Complexity /10 | Expected reliability /10 | Production TypeScript lines for assignment and claim |
|---|---|---|---|---|
| One accountable assignee, explicit claim/reassign/release | 9 | 4 | 9 | 2,500-5,000 |
| Multiple equal assignees with joint acceptance/completion rules | 6 | 7 | 7 | 4,000-8,000 |

An authorized assignment can either take effect immediately or create an offer
that the person accepts. The owner must choose that visible behavior before the
corresponding command is admitted. Permissions alone do not decide consent or
acceptance semantics. An offer lifecycle is added only for a demonstrated need,
not as a mandatory workflow around every small-team assignment.

Scores are engineering judgments, not measured probabilities or uptime.
Complexity 10 means harder. Line ranges assume existing authority, transaction,
outbox, identity, and Task primitives; they exclude UI, generated code, tests,
provider implementation, and infrastructure foundations. Estimate confidence is
4/10. The ranges overlap and must not be added as independent module budgets.

## Proposed ownership model

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

## Acceptance criteria

- A mixed Team can display people and agents without conflating their identity,
  authority, versioning, or execution state.
- The chosen human membership cardinality is explicit and independently tested
  from Agent one-current-Team and one-active-Run occupancy.
- An authorized agent can request manual human work through the same owning
  application commands available to other clients; insufficient or revoked
  delegation rejects the command.
- Human self-claim and concurrent assignment use the expected Work revision,
  command idempotency, and authoritative transaction. One assignment winner is
  observed; a preliminary availability query cannot grant the claim.
- Actor and assignee remain distinct in authorization and audit. A target is
  currently eligible in the correct project; membership removal cannot leave
  unexplained effective access.
- Assignment versus offer, reassignment of active work, and deprovisioning each
  have an owner, transition result, and recovery policy.
- Human-only Tasks work without an active Run. Starting, failing, or stopping
  an agent does not silently complete, delete, or reassign those Tasks.
- A Task has one authoritative lifecycle and assignment across every saved view.
  A personal work query filters each source by current access and preserves
  tenant/project identity in links, cursors, and commands.
- Historical Team and Run versions remain immutable. Human inclusion in a Run
  cannot silently weaken required Agent version, activation, or occupancy checks.
- Standalone Self-Hosted and managed deployments expose the same collaboration
  capabilities through their independently configured authority adapters.

## Resolution

Open. Mixed collaboration and multiple task views are confirmed direction.
Human membership cardinality, assignment responsibility and acceptance, exact
identity contracts, and any human contribution to Run completion remain explicit
implementation decisions. No production capability is admitted by this record.
