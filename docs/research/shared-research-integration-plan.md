---
id: research.shared-research-integration
type: research
status: active
owner: integration/runtime
summary: Proposed owner-local follow-through from shared competitor research, preserving accepted decisions and unresolved product policies.
related:
  - ADR-0114
  - ADR-0115
  - OD-024
  - OD-032
---

# Shared Research Integration Plan

## Scope and provenance

Research integration proposal dated 2026-11-03. The planned shared evidence
source is `agent-teams-ai/engineering-research`, `docs/competitors/paperclip.md`.
Publication is pending. This maintained report's `active` status does not accept
its proposed follow-through or change an existing decision. Shared competitor
facts and methods belong in the central research record; product policy,
implementation acceptance and unresolved choices remain here with their owners.

The source review inspected Paperclip at
[`61e8d5c7eb097664958e00c30ccd88bb51359043`](https://github.com/paperclipai/paperclip/tree/61e8d5c7eb097664958e00c30ccd88bb51359043).
It is source and committed-evidence review, not an executed competitor benchmark.
Its durable command identities, uncertain-outcome handling, resource protections
and bounded viewer delivery are useful positive evidence. A particular lock,
queue or deployment constraint does not establish a numerical agent ceiling.

## Findings and design options

### Existing choices remain the baseline

[ADR-0045](../decisions/0045-three-usage-bounded-contexts.md) already establishes
Usage Metering, Usage Accounting and Consumption Governance, including soft limits,
hard quotas and the reservation lifecycle. Do not reopen a choice between hard
and soft policy. [OD-024](../open-decisions/OD-024-usage-accounting-boundaries-and-exact-quantities.md)
owns detailed estimates, overshoot, reconciliation, aggregate boundaries and
concurrency. The [Consumption Governance dossier](../domain/contexts/consumption-governance/README.md)
remains proposed at the tactical level.

[ADR-0114](../decisions/0114-canonical-backend-stack-and-distributed-role-adoption.md)
and [ADR-0115](../decisions/0115-canonical-fully-local-v1-adoption.md) own service
roles, selected transport/storage responsibilities and Fully Local V1. Preserve
required role isolation and materialize each selected role with its first owning
feature. A small initial workload does not authorize an in-process fallback
where the accepted role map requires a process boundary.

### Proposed refinements within existing owners

| Priority and question | Owner and current route | Acceptance detail to carry into the existing slice |
| --- | --- | --- |
| Before consumption implementation: what promise does a policy make? | Consumption Governance; OD-024 | State allowance basis, estimate, period, overshoot and freshness. Race reservation with capture/release, expiry, policy reduction and unknown commit. A provider spend estimate is not an externally enforced dollar cap. |
| Before usage implementation: what writes serialize? | Usage Metering and Usage Accounting; [persistence boundary](../architecture/persistence-boundary.md) | Keep immutable idempotent source receipts distinct from rollups and mutable governance balances. Inventory all same-scope writers before changing a lock. Compare one large tenant with many small tenants and include zero-policy and configured-policy workloads. |
| Before dispatch integration: what is eligible and authorized? | Work Coordination and Run Orchestration; [runtime boundary](../architecture/runtime-boundary.md) | Provide stable dependency eligibility, authorized workload classification and resource demand. Preserve identity on replay and policy snapshots. Runtime owns technical capacity admission and reclaim; no duplicate product scheduler or copied runtime queue. |
| During runtime integration: how does business work continue? | Run Orchestration and Execution Observation; [OD-013](../open-decisions/OD-013-partial-failure-and-compensation.md) | Distinguish waiting, accepted, executing, unknown, terminal and cleanup observations as the published contract specifies. A cancelled product request does not prove a physical process stopped. Reconcile under the original identity. |
| During side-effect integration: where is revocation checked? | Owning capability and runtime boundary; [OD-032](../open-decisions/OD-032-last-mile-side-effect-safety.md) | Preserve receiver-enforced authority and the accepted cutoff boundary. Delayed spend/view projections cannot replace current security decisions or grant fresh authority. |
| During feed integration: can summary views stay bounded? | Owning context feed and client edge; [SDK and transports](../architecture/sdk-and-transports.md) | Separate latest-state summaries from selected detailed streams. Bound subscription cardinality, retained count/bytes and replay work; authorize materialized items and handle policy changes, slow viewers, gaps and resynchronization. |
| Before profile qualification: does reconstruction survive overlap? | Existing roles and feature-owned outbox/inbox; [eventing](../architecture/eventing-and-reliability.md) | Lose, duplicate and delay notifications while controllers overlap beyond a rollout window. Durable owner state remains authority; the selected JetStream integration transport does not itself supply quota fairness or physical reclaim. |

These rows refine existing task acceptance and required failure traces. They do
not introduce a new central gate, universal IAM or accounting framework, shared
product domain, package or transport. Reuse a mechanism through a narrow owner
contract when there is a concrete shared consumer. Keep ordinary typed
collaboration inside a role and established adapters across roles.

## Decision status and qualification

Exact quantities retain [ADR-0046](../decisions/0046-exact-usage-and-money-values.md)
and the PostgreSQL profile. Observe usage independently from pricing and policy;
rebuildable projections cannot become authoritative quota balances. The accepted
context split does not authorize the still-proposed tactical aggregates.

Use OD-024 for remaining consumption semantics and OD-032 for side-effect safety.
Use the existing [implementation readiness gates](../architecture/implementation-readiness-gates.md)
for the first production slice. Numerical targets remain under the current
[reliability objectives](../architecture/reliability-objectives.md) process.
No source inspection, model fixture or documentation change promotes a
thousands-of-active-agents claim.

Runtime v3 ordinary S1-S5 and its separate capacity C0-C3 program have different
scope. Orchestrator integrates the published technical outcomes; it does not
make ordinary-runtime completion equivalent to fleet qualification or require
another runtime allocation implementation. Global, tenant and provider limits
must have explicit owners when work spans pools; no pool may independently
consume the whole shared allowance.

## Evidence and sources

The planned central record retains Paperclip facts, exact sources, limitations
and alternative assessments. Until publication, the source snapshot above is
provenance only. This document proposes local acceptance refinements without
claiming completed migration or fresh test execution.

Current owner references include [OD-024](../open-decisions/OD-024-usage-accounting-boundaries-and-exact-quantities.md),
[Consumption Governance](../domain/contexts/consumption-governance/README.md),
[OD-032](../open-decisions/OD-032-last-mile-side-effect-safety.md), the
[runtime boundary](../architecture/runtime-boundary.md) and
[deployment profiles](../architecture/deployment-profiles.md).
The existing [research index](README.md) retains its historical source reports.

## Limitations and remaining questions

Central publication is pending. Existing source comparisons can later move
reusable facts centrally while their local decision sections and stable IDs
remain valid. Preserve accepted ADR bodies, historical evidence, used anchors
and exact adoption pins. Do not replace an old pinned citation with a moving
central branch and silently imply a new observation date.

This change contains zero production implementation lines. Any implementation
estimate must subtract already-planned consumption, feed and runtime integration
work and count the remaining slice once. Tests, configuration and release work
are separate estimates. A new implementation choice requires the existing
owner's concrete alternatives and approval route; this report adds no new
approval ritual for routine documentation or existing authorized work.
