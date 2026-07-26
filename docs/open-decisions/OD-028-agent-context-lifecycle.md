---
id: OD-028
type: open-decision
status: open
owner: architecture/domain
summary: Decide Agent Context ownership, lifecycle, manifests, checkpoints, and runtime materialization boundary.
related:
  - architecture.context-map
  - architecture.runtime-boundary
  - domain.contexts.run-orchestration
  - OD-004
  - OD-006
---

# OD-028: Agent Context Lifecycle

## Decision required

Decide whether semantic Agent Context is a separate bounded context or a focused
Run Orchestration capability, and define its boundary with source contexts, Policy
and Risk, Consumption Governance, Run Orchestration, and AR.

The model must replace the implicit giant-prompt wire protocol with versioned,
provider-neutral context identity while preserving provider-specific compilation,
native caching, tool search, compaction, and resume inside AR.

## Candidate language

```text
ContextSource
SourceRevision
ContextPlan
ContextManifest
ContextCheckpoint
ContextDelivery
DisclosureDecision
MaterializationReport
ContextInvalidation
RehydrationPlan
ContextPressure
```

These are discovery candidates, not accepted aggregate names.

## Fixed boundary constraints

- Source contexts remain authoritative for Work, Message, Topology, Memory, Policy,
  and other product facts. Context planning cannot copy their aggregates.
- Hard product invariants remain domain/application code and never rely on prompt
  obedience.
- Policy and Risk owns execution/trust decisions. Consumption Governance owns
  monetary budgets and quotas. Context planning consumes their decisions.
- Run Orchestration remains the only product owner that commands execution and
  decides whether to continue, pause, restart, or replace a runtime.
- AR owns provider formatting, roles, tokenization, native cache and compaction
  mechanics, provider-session state, and actual materialization.
- Tool availability is enforced technically by AR and policy. Hiding tool text from
  a prompt is not authorization.
- A model-generated summary is lossy and cannot replace lossless control state,
  source revisions, required instructions, permissions, or delivery checkpoints.
- Raw prompts, workspace content, and secret-bearing context cannot enter ordinary
  JetStream events, logs, or telemetry.
- Capability presets are user-facing profiles over explicit capabilities, policy,
  and purpose, not hard-coded classes of agents.

## Options

1. A separate Agent Context bounded context inside the modular monolith, with a
   provider-neutral Published Language and AR materialization adapter.
2. A focused Context capability inside Run Orchestration designed for later
   extraction.
3. Runtime-owned context with only a thin product intent from the Orchestrator.

## Acceptance criteria

- Event-storming proves a cohesive language, independent lifecycle, concurrency,
  security boundary, and first vertical slice before any package is created.
- A manifest records source revisions, policy/capability snapshots, required versus
  optional contributions, composition version, hashes, sensitivity, freshness, and
  expiry.
- AR returns a typed materialization report for applied, dropped, downgraded,
  delegated, or rejected contributions.
- Required context fails explicitly when it cannot fit or cannot be enforced.
- Compaction and resume rehydrate current semantic context rather than replaying an
  old prompt byte-for-byte.
- Revocation distinguishes future nondisclosure from content already disclosed to
  a provider and produces an explicit remediation decision.
- Provider switch, runtime replacement, fork, concurrent refresh, and stale receipt
  scenarios have deterministic revision and fencing behavior.
- The first prompt can remain minimal while identity, trust, current purpose, Work
  discovery, inbox discovery, and mandatory instructions remain reliable.

## Resolution

Open. When resolved, set `status: resolved` and link the deciding ADR.
