---
id: research.collaboration-hierarchy-and-workspace-review-2026-10-22
type: research
status: active
owner: architecture/domain
summary: Preserve collaboration, hierarchy, Task view, and Workspace design options with explicit decision and evidence status.
related:
  - ADR-0044
  - ADR-0072
  - ADR-0100
  - ADR-0110
  - ADR-0111
  - OD-012
  - OD-019
  - OD-023
  - OD-027
  - OD-032
  - OD-048
  - architecture.composition
---

# Collaboration, Hierarchy, and Workspace Review, 2026-10-22

## Scope and provenance

This report reconciles the product-owner discussion retained in the 2026-10-21
documentation work with a coverage audit on 2026-10-22. The source baselines are
Orchestrator PR #86 at `8483949960cb783fe70090e2e7fbf526a043d362` and Platform
main at `83d761b84e23bb6d1e9c446f3666951e94fa90d8`. Companion edits on those
baselines make missing product direction and cross-repository ownership explicit.
They are proposed repository changes until their respective branches are merged.

The method was a document and accepted-contract review with three parallel
`gpt-6.1-sol` audits at `xhigh` reasoning: Orchestrator decision coverage, Platform contract
consistency, and research preservation. The product model was checked against
the current owner boundaries instead of inferring new aggregate semantics from
UI names. This is a synthesis of retained decisions and evidence, not a verbatim
conversation or agent transcript. No collaboration runtime, IAM deployment,
capacity experiment, or new product implementation was executed for this report.

An accepted decision, confirmed product direction, leading option, and future
idea have different status. Research records all four without promoting the
last three into accepted implementation contracts.

The initial comparison below is retained as historical evidence. The owner's
later choices and a second critic review are recorded in
[Later owner decisions and critic review](#later-owner-decisions-and-critic-review).
That section corrects the earlier coupling of multiple executors to mandatory
joint acceptance/completion and links the deciding ADR rather than silently
rewriting the earlier recommendation.

## Findings and design options

### Product shape and repository ownership

Orchestrator can be self-hosted and released independently. Its collaboration and
orchestration core must work without the commercial Platform. A single
installation should support several independently governed organizations; one
human can participate through separate memberships without requiring a new
person identity for each organization. Membership removal in A must not silently
remove membership or access in B. Exact identity, Tenant, and semantic
Organization mappings remain owned by OD-012, OD-019, and OD-023.

Platform is the commercial hosted control plane around Orchestrator. The managed
product is intended to run agents on the service operator's infrastructure.
That intention does not prescribe one deployment per customer or equate an IAM
organization, customer, Tenant, department, Project, and execution scope.
Platform's accepted ADR-0007 permits one CustomerOrganization or PersonalSpace
to own several Tenants. Each active Tenant has one owner binding; each
ProductProject belongs to one Tenant. Other binding constraints retain the status
of the owning decisions referenced in the [Platform boundary record][platform-boundary].

The broad product relationship belongs in that Platform document. Orchestrator
retains its standalone guarantees, local ownership, authority adapters, and
extension seams in its [composition contract][composition] and
[deployment profiles][deployment]. Each repository links to the other; neither
copies the complete other product model. Exact cross-system protocols and their
compatibility review remain proposed. Independent releases require explicit
compatible contract/capability versions, not simultaneous product upgrades.

### Coverage of the discussion

The following map records authority or the owning open
question. "Confirmed direction" describes the requested product, not a claim
that the capability is implemented. "Accepted" refers to the cited decision in
its own branch history; pending PRs are not merged main-branch authority. Statuses
in this initial map precede the later owner decisions recorded below.

| Discussed requirement | Record and owner | Status and remaining boundary |
|---|---|---|
| Orchestrator can be self-hosted without Platform | [Composition][composition], [deployment profiles][deployment] | Independence constraint; no mandatory commercial endpoint or shared business database. |
| Several organizations per installation; one person in several organizations | [Deployment profiles][deployment], [OD-012][identity], [OD-023][organization] | Confirmed baseline; exact principal/membership and scope mapping still requires qualification. |
| Commercial hosted Platform manages customer relationships and delivery | [Platform boundary][platform-boundary] | Product direction with accepted Platform strategic ownership; complete billing/accounting boundaries are not reserved by ADR-0007. |
| Platform reuses Orchestrator's engine through API/SDK | [Composition][composition], [Platform boundary][platform-boundary] | Required ownership direction; no duplicate Team, Task, or Run engine, cross-product database access, or shared transaction. |
| Share concrete technical mechanisms where both products need them | [Composition][composition], [Platform boundary][platform-boundary] | Explicit library owner and narrow contracts; product policies and aggregates remain separate. |
| Mandatory Get Modular and nested feature rules | [ADR-0110][modular-decision], [module research][modular-research] | Accepted Orchestrator foundation choice; Platform records the required direction but its own adoption is pending. |
| Build the module foundation before broad feature expansion | [Implementation gates][gates], [module research][modular-research] | Activation requires actual consumer and source-conformance evidence; no permanent handwritten assembly alternative. |
| Hooks, events, Observation, and resource lifecycle use their proper contracts | [Composition][composition], [module research][modular-research] | Observation is replaceable state, not a durable event or revocation log; host lifecycle remains explicit. |
| Hundreds of modules and thousands of agents | [Module research][modular-research], [identity research][identity-research] | Growth goal; compiler fixtures, graph entries, services, and live agents are different measurements. No unqualified capacity promise. |
| People and AI agents appear in the same Teams | [OD-048][participation] | Confirmed product direction; current Agent-specific roster needs an explicit successor contract. |
| Employees, coordinators, and other organizational roles have explicit permissions | [OD-048][participation], [OD-012][identity], [OD-023][organization] | Membership, placement, assignment, and coordinator selection do not grant permissions automatically; exact role/grant mapping remains explicit. |
| Humans perform manual work without being started | [OD-048][participation] | Confirmed direction; no runtime session, Agent occupancy, or fabricated heartbeat for a human Task. |
| An agent can create or assign work to a person; a person can create or self-claim | [OD-048][participation] | Confirmed direction through authenticated, authorized owner commands; assignment acceptance remains open. |
| People may belong to several Teams and see personal work across them | [OD-048][participation] | Leading option, not accepted cardinality; each source Task retains its current scope and access checks. |
| Existing Agent one-current-Team rule | ADR-0100, [OD-048][participation] | Accepted Agent invariant retained; it does not automatically constrain human membership. |
| One accountable Task assignee versus several equal assignees | [OD-048][participation] | Open responsibility model; collaborators/reviewers/watchers need not be equal assignees. |
| Tasks support different presentations, not a mandatory Kanban model | [OD-027][work], [OD-048][participation] | Confirmed direction; board, list, calendar, timeline, and personal work share one Work authority. |
| Start with one Team and grow to company/department/matrix structures | ADR-0044, [OD-023][organization] | Strategic semantic Organization model accepted; exact aggregates, transactions, and human bindings remain open. |
| Deep organizational hierarchy | [OD-023][organization] | Units and project-qualified Team placements; no nested Tenant or recursively expanded execution roster by implication. |
| Visible Workspace and technical execution resource are different concepts | [OD-019][workspace] | Distinction recorded; new scope or resource lifecycle requires its own decision. |
| Rename the technical execution resource to reduce confusion | [OD-019][workspace] | Alternatives retained; no accepted ID, API, or resource has been renamed. |
| Future cooperation between organizations or installations | [OD-023][organization], [Platform boundary][platform-boundary] | Future direction with explicit target-scope authority; the standalone guest contract, federation, and cross-tenant execution remain open. |
| Keycloak + OpenFGA versus ZITADEL + OpenFGA | [OD-012][identity], [identity research][identity-research] | Keycloak + OpenFGA provisional; provider/lifecycle qualification remains open. |
| Separate services with Dapr/Protobuf | [PR #79][services-pr] | Separate in-flight architecture work; this audit neither adopts nor overwrites its topology. |
| Related plugin and research-navigation refinements | [PR #88][plugins-pr] | Separate stacked change; not folded into this coverage audit or treated as merged. |

### Mixed participation and assignment

Team membership, permission to manage a Team, Task assignment, and eligibility
to execute an AI Run answer different questions. One cannot be used as an
implicit substitute for another. An agent's model output does not authorize a
command; the caller supplies authenticated actor/subject and current scoped
authority. Assignment does not itself activate an agent, and activation failure
does not delete a human Task or saved Team.

The retained comparison from OD-048 is:

| Option | Confidence /10 | Complexity /10 | Expected reliability /10 | Production TypeScript lines |
|---|---|---|---|---|
| Multiple human Team memberships with one authorized personal-work query | 9 | 4 | 9 | 800-1,800 |
| One exclusive human Team with temporary collaboration exceptions | 4 | 5 | 7 | 700-1,600 |
| At most one accountable Task assignee with claim/reassign/release | 9 | 4 | 9 | 2,500-5,000 |
| Multiple equal assignees with joint acceptance/completion | 6 | 7 | 7 | 4,000-8,000 |

The recommendations are multiple human memberships and at most one accountable
assignee. An unassigned Task is possible; a list of collaborators need not own
completion. Work-owned completion policy remains authoritative regardless of
assignee count. These are recommendations for the owner to choose, not an
accepted change to TeamMember, Run roster, or Work contracts.

The initial assignment behavior also needs a product choice: an authorized
assignment may take effect immediately or create an offer requiring acceptance.
Self-claim need not create an offer to oneself. An offer introduces decline,
expiry, replacement, concurrency, and offboarding behavior; it must not become
a new Work lifecycle state merely to reuse board columns. No separate numerical
offer estimate was present in the retained 2026-10-21 comparison. The audit added
the following explicitly new planning judgments to OD-048 on 2026-10-22:

| Option above the future baseline assignment primitive | Confidence /10 | Complexity /10 | Expected reliability /10 | Incremental production TypeScript lines |
|---|---|---|---|---|
| Immediate authorized third-party assignment | 8 | 3 | 8 | 0-300 |
| Offer requiring the intended person's acceptance | 6 | 6 | 8 | 800-2,000 |

Estimate confidence for these deltas is 2/10. The baseline primitive is neither
implemented nor admitted; the numbers are not total feature sizes. The offer
slice is bounded to one pending offer on an unassigned Task, create/accept/
decline/cancel, current authority and eligibility at commit, revision/idempotency,
and rejection of stale or concurrent offers. It excludes active-work
reassignment, batches, joint assignees, cross-organization workflows, a new timer
or notification system, UI, tests, and base infrastructure. Deadline validity
may be checked by commands. OD-048 retains the full scope and open product choice.

All scores are planning judgments, not measured reliability. Complexity 10 means
harder. Ranges assume identity, authority, transaction, outbox, and Task primitives;
they exclude UI, tests, generated/vendor code, and base infrastructure. Estimate
confidence for the retained membership/assignment ranges is 4/10. The scopes
overlap and are not additive module budgets.

### Organization growth without a second Team engine

A small organization should not need to create every possible organizational
layer before using one Project and Team. When needed, the already accepted
semantic Organization model supplies named cycle-free structures, stable units,
and project-qualified Team placements. A unit may be called a department or team
by the customer without becoming a recursively executable Team roster.
Matrix arrangements use separate structures or typed relationships.

| Model | Confidence /10 | Complexity /10 | Expected reliability /10 | Production TypeScript lines |
|---|---|---|---|---|
| Existing units and project-qualified Team placements | 9 | 5 | 9 | 2,500-6,000 |
| Recursive operational Team rosters | 4 | 8 | 6 | 5,000-12,000 additional to base Team/Run support |

These retained OD-023 ranges cover a bounded hierarchy/placement slice or the
extra recursive-roster behavior, excluding UI, tests, generated code, federation,
and base infrastructure. Neither is a capacity measurement. The first model
fits the accepted strategic boundary; the second would reopen versioning,
duplicate Agent checks, coordinator selection, and Run snapshots. Exact
aggregate and transaction semantics still need event-storming and concurrency
cases before implementation.

Organizational containment never grants permissions automatically. A human's
organization membership, Team relationship, and effective access each have an
explicit owner. In Platform, organization membership and TenantAccessGrant are
already separate: a member does not receive all current or future Tenants by
membership alone. Future guest cooperation must use explicit current
target-scope authority; standalone membership/grant semantics remain deferred.
It does not establish shared identity, trust, lifecycle, or cross-installation
Work execution by itself.

### Workspace and Task views

In product language, **Workspace** can mean the place where people see their
authorized Teams, Tasks, and activity. A technical execution resource is the
registered, allocated filesystem materialization an agent uses. A navigation
label does not need a new membership store, security scope, or parent of Project.
OD-019 must justify and define any later independent Workspace lifecycle.

| Technical name | Confidence /10 | Complexity /10 | Expected reliability /10 | Production TypeScript lines |
|---|---|---|---|---|
| Execution Workspace | 9 | 2 | 9 | 0-200 |
| Execution Directory | 8 | 3 | 8 | 200-800 |
| Execution Environment | 4 | 6 | 5 | 400-1,200 |

These retained OD-019 estimates cover bounded naming/adapter changes after a
choice, not implementation of storage, UI, tests, or generated contracts.
Execution Directory is the clearer candidate if its definition still includes
opaque managed remote materializations. Execution Environment risks implying
ownership of process isolation or networking that belongs to AR. Existing
WorkspaceRegistration and ExecutionWorkspaceAllocation identities remain intact
until an explicit rename/migration is accepted.

Board, list, calendar, timeline, review queue, and personal work are different
projections of the same Tasks. The TaskView candidate in OD-027 stores query,
grouping, and layout preferences; it cannot independently complete a Task or
grant access. OD-027's larger lifecycle comparison estimates publication,
transitions, bindings, and migration. Its 3,500-9,000-line leading range is not
the cost of adding a board or saved view, and this report does not relabel it as
such.

### Reuse without coupling the products

Platform should call producer-owned Orchestrator contracts and map them into
its own consumer ports. A narrow authentication, provider, transport, or
relationship-projection mechanism may have one reusable library when a second
consumer or concrete repeated need justifies it. Shared product aggregates,
cross-product transactions, and a universal policy engine would couple release
and lifecycle decisions that have different owners.

This is also why mandatory Get Modular does not imply a new shared distributed
container. Each applicable TypeScript process assembles its own selected graph.
Other-language services interoperate through published contracts. The framework
choice, module-foundation gates, Observation semantics, and supported scale
limits are preserved in the [separate module review][modular-research].

This audit did not run a separate reuse benchmark or estimate a universal shared
library. No numerical reliability or LOC saving is claimed for that abstraction.
The concrete first repeated mechanism should supply the evidence before broader
extraction.

## Decision status and qualification

ADR-0044's semantic organization boundary, ADR-0100's Agent membership invariant,
ADR-0072's Work completion authority, and ADR-0110's module foundation retain
their accepted status in the reviewed branch. The audit does not edit accepted
decision bodies or manufacture a retrospective acceptance record.

OD-012, OD-019, OD-023, OD-027, and OD-048 own their remaining decisions. Their
current contents take precedence over this dated comparison when a later choice
changes. Platform's boundary record remains proposed for exact cross-repository
contracts, while its referenced accepted Platform decisions retain authority.
Platform's Get Modular requirement is recorded separately from its still-current
v1 profile and pending adoption evidence.

Module activation, source enforcement, mixed participation, public resource
identity, and Task assignment require their owning qualification. A smaller
useful first slice can be qualified without claiming the eventual maximum
organization or agent scale. Research preservation does not admit production
code or excuse a missing acceptance gate.

## Evidence and sources

- [Reviewed Orchestrator source](https://github.com/agent-teams-ai/agent-teams-orchestrator/tree/8483949960cb783fe70090e2e7fbf526a043d362)
- [Reviewed Platform source](https://github.com/agent-teams-ai/agent-teams-platform/tree/83d761b84e23bb6d1e9c446f3666951e94fa90d8)
- [Platform ADR-0007: strategic ownership and first Project Management slice](https://github.com/agent-teams-ai/agent-teams-platform/blob/83d761b84e23bb6d1e9c446f3666951e94fa90d8/docs/decisions/0007-platform-strategic-context-map-and-first-project-management-slice.md)
- [Orchestrator ADR-0044: tenant-scoped Agent Organization](../decisions/0044-tenant-scoped-agent-organization.md)
- [Current Platform relationship and boundary record][platform-boundary]
- [Companion Platform documentation branch][platform-draft]
- [Orchestrator draft PR #86](https://github.com/agent-teams-ai/agent-teams-orchestrator/pull/86)
- [Orchestrator Task lifecycle alternatives and bounds][work]
- [Independent service-topology work, PR #79][services-pr]
- [Independent plugin/research-navigation work, PR #88][plugins-pr]

[composition]: ../architecture/composition-and-dependency-injection.md
[deployment]: ../architecture/deployment-profiles.md
[gates]: ../architecture/implementation-readiness-gates.md
[modular-decision]: ../decisions/0110-mandatory-get-modular-and-nested-feature-foundation.md
[identity]: ../open-decisions/OD-012-identity-authorization-tenant-isolation.md
[workspace]: ../open-decisions/OD-019-public-resource-identity-and-scope.md
[organization]: ../open-decisions/OD-023-agent-organization-model.md
[work]: ../open-decisions/OD-027-configurable-work-lifecycle.md
[participation]: ../open-decisions/OD-048-mixed-human-and-ai-team-participation.md
[identity-research]: identity-provider-comparison-2026-10-21.md
[modular-research]: get-modular-adoption-and-scale-review-2026-10-21.md
[platform-boundary]: https://github.com/agent-teams-ai/agent-teams-platform/blob/main/docs/architecture/platform-orchestrator-boundary.md
[platform-draft]: https://github.com/agent-teams-ai/agent-teams-platform/blob/docs/product-relationship-and-research/docs/architecture/platform-orchestrator-boundary.md
[services-pr]: https://github.com/agent-teams-ai/agent-teams-orchestrator/pull/79
[plugins-pr]: https://github.com/agent-teams-ai/agent-teams-orchestrator/pull/88

## Limitations and remaining questions at the initial review

Three visible product choices should be answered before their corresponding
implementation slice: human multiple-Team membership; at-most-one accountable
assignee versus joint ownership; and immediate assignment versus an offer that
must be accepted. The leading recommendations above do not close OD-048.

The technical execution name can be decided separately before a public rename.
Human participation in Run completion/quorum, exact organization and principal
bindings, configurable lifecycle migration, IAM qualification, and cross-system
compatibility retain their owning open decisions. Cross-installation federation
remains future work, not a prerequisite imposed on the initial small-team flow.

This report cannot establish measured usability, operator burden, throughput,
availability, or implementation size. Dated comparative scores and line ranges
are planning aids with stated scope; they are not combined delivery estimates.
The archive preserves what was discussed and where to resolve it without
claiming that every detailed contract has already been decided.

## Later owner decisions and critic review

Later on 2026-10-22 the owner explicitly confirmed human multiple-Team membership
with one personal queue, selected **Execution Directory**, and delegated the
assignment-model choice after describing two equal people solving one Task.
The owner also asked to record dangerous-action approvals as a separate,
unresolved subject for later detailed research. This follow-up uses the published
Orchestrator `9bfc1526a286d386339144a9a376a94de06f3ce4` and Platform
`e653450ece39743eff881842c4b06b9d276deda9` baselines.

Three further `gpt-6.1-sol` critics at `xhigh` reviewed joint Task assignment,
approval boundaries, and Execution Directory adoption. This was source and
contract review, not a runtime experiment or the deferred industry-practice
study of dangerous-action approval systems. The resulting policy is recorded in
[ADR-0111](../decisions/0111-human-collaboration-and-execution-directory-terminology.md).

### Updated coverage

| Discussed requirement | Outcome and owner | Remaining boundary |
|---|---|---|
| A human can belong to several Teams and see personal work across them | Selected in ADR-0111; OD-048 owns the tactical slice | One authorized query preserves source scope and deduplicates Tasks; exact membership/identity contracts and qualification remain open. |
| Two people can solve one Task as equals | Selected: zero or more equal human or Agent executors, immediate authorized assignment | Work retains one lifecycle and completion authority; exact commands, limits, storage and recovery remain open. |
| Assignment offers and dangerous-action approval are different | No mandatory assignment offer; dangerous actions require product approvals under [OD-032](../open-decisions/OD-032-last-mile-side-effect-safety.md#deferred-dangerous-action-approval-research) | Approver eligibility, exact action binding, expiry/revocation and enforcement details are deferred. No detailed approval architecture is accepted. |
| Workspace and technical execution resource need different names | Workspace remains the UI term; Execution Directory is selected under ADR-0111 | ADR-0062's registration/allocation identities and owners remain intact; exact API spelling and any migration remain in OD-019. |
| Both products must record their relationship and use the same owner contracts | [Platform PR #55](https://github.com/agent-teams-ai/agent-teams-platform/pull/55) records the companion relationship and links Orchestrator policy | Platform consumes API/SDK contracts; exact cross-repository protocols remain proposed. |

### Correction to the assignment comparison

The earlier comparison combined two independent dimensions: how many people can
execute a Task, and whether every participant must accept or complete it.
Multiple equal executors require a bounded set, identity uniqueness and explicit
mutations, but do not require an offer engine or a completion quorum. ADR-0072
already supplies one Work-owned completion decision with configurable evidence.

The selected model lets two people share one result. Both are real executors;
neither becomes a subordinate collaborator merely to preserve a single-assignee
field. Self-claim adds oneself without removing existing executors; release
removes oneself; replacing an executor names that source and target explicitly.
Removing the last leaves the Task unassigned. Assignment never grants access,
starts an Agent, or approves a dangerous action.

Changes use the expected Work revision, idempotency and authoritative transaction.
If Alice and Bob both claim revision 12, only one command commits revision 13.
The other may reload and retry to join the updated set. This is one winning
change against a revision, not one executor for the Task's lifetime. Completion
permission and the pinned Work plan remain separate from executor membership.

| Assignment model | Confidence /10 | Complexity /10 | Expected reliability /10 | Handwritten production TypeScript lines |
|---|---|---|---|---|
| Selected: zero or more equal executors, immediate assignment, ordinary Work completion plan | 9 | 5 | 9 | 3,000-6,000 |
| One accountable assignee plus real executing collaborators in personal work | 6 | 6 | 8 | 3,000-6,500 |
| Multiple executors with mandatory offers, individual completion and joint quorum | 5 | 8 | 7 | 5,000-10,000 |

Estimate confidence is 3/10. These are engineering judgments, not measurements;
higher complexity means harder. Scope covers assignment domain/application
behavior, consumer-owned authority checks, revision/idempotency integration,
one persistence adapter and migration, outbox/public-contract mappings, and
handwritten API/SDK changes over existing Task and infrastructure primitives.
It excludes UI, tests, generated code, authority-provider implementation,
infrastructure foundations, notifications, Agent activation and a general
offer/quorum engine. The richer option includes its bounded mandatory offer and
joint-completion behavior, not a universal workflow system. These ranges replace
the earlier assignment comparison for current planning and cannot be added to
membership estimates without reviewing their overlapping scope.

### Remaining research and implementation limits

Human membership cardinality, equal joint assignment, initial immediate
assignment and the technical name no longer require another product choice.
Exact public identities, typed commands, aggregate/storage boundaries,
deprovisioning, terminal-Task assignment edits, human Run participation and
conformance still belong to OD-048, OD-006, OD-019 and OD-027. The current
metadata-only production admission is unchanged.

Dangerous-action approval research must resolve which actions require approval,
who may approve with current authority or delegation, the exact action/argument/
resource-version binding, expiry and revocation, final dispatch checks, and
unknown or duplicate outcomes. Task consent, authorization, product approval,
AR technical permission and Work completion remain separate. The existing
Approval Management, Policy and Risk, feature and runtime ownership applies;
this follow-up chooses no new central engine, reusable approval credential,
quorum or mandatory human-review policy.

Execution Directory terminology includes managed remote filesystem views. This
documentation update adds no production TypeScript and renames no existing
public, package, catalog, code or stored identity. The earlier naming LOC ranges
were conditional migration estimates; they are not the cost of this terminology
record or an admitted implementation budget.
