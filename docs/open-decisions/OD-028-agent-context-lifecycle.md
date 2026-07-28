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
  - OD-026
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
ContextLineage
ContextContribution
ContextApplication
SourceRevisionVector
ContinuityGrade
LossReport
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
- Agent Context is not a webhook hub, Conversation store, universal event archive,
  generic RAG platform, Memory owner, or second Run Orchestration context.
- External change notifications are untrusted observations. They never become
  prompt content without source retrieval, current authorization, provenance, and
  semantic-owner translation.

## Current draft hypothesis

A separate Agent Context bounded context inside the modular monolith is the
leading candidate. It owns verified composition of versioned contributions, not
all information known by an agent. It has its own application, domain,
persistence, inbox, outbox, and Published Language boundaries, but does not become
a separately deployed service in the first version.

The candidate owns:

- source selection, provenance, revision vectors, and composition;
- instruction authority, ordering, conflict detection, and disclosure;
- multidimensional context budgeting and required-content fit;
- immutable manifests and portable semantic checkpoints;
- freshness, invalidation, and successor planning;
- idempotent context application and materialization evidence;
- provider-neutral continuity and explicit provider-switch loss reporting.

Source ownership remains outside this context:

- Work owns tasks, comments, dependencies, and lifecycle;
- Agent Communication owns messages, participants, and Conversation history;
- Memory owns facts, evidence, confidence, expiry, and supersession;
- Attention owns recipient relevance, urgency, digest, and interruption intent;
- Integration Management owns connector installation, vendor authentication,
  webhook cursors, raw dedupe, and reconciliation;
- Policy and Risk owns trust, authorization, and egress decisions;
- Consumption Governance owns money and quota;
- Run Orchestration owns execution authority and runtime lifecycle decisions;
- AR owns provider sessions, tokenizer and capability observations, compilation,
  native context mechanics, and actual technical materialization.

## Candidate model

```text
ContextLineage          logical continuity across Runs and providers
ContextManifest         immutable content-addressed composition artifact
ContextContribution     exact disclosed derived artifact and source provenance
SemanticCheckpoint      portable verified continuity artifact
NativeCheckpoint        opaque AR/provider continuation reference
ContextApplication      process manager for one manifest-to-runtime application
ProviderEnvelope        adapter projection, never a domain aggregate
MaterializationReport   evidence returned by AR
```

`ContextBranch` remains a reserved candidate rather than a first-version
aggregate. `lineageId`, `parentManifestId`, and an optional branch reference
preserve future compatibility until fork, review, speculation, or rollback proves
a real concurrent-branch invariant. Compaction alone does not create a branch.

An immutable manifest is not a giant aggregate. A small lineage aggregate governs
continuity and successor rules; exact disclosed artifacts, manifests, and
checkpoints are immutable records. A Context Application coordinates asynchronous
application and ambiguous outcomes without importing AR domain models.

## Observation and OODA draft

OODA describes collaboration among contexts, not a new aggregate or workflow
engine:

```text
Observe  Integration verifies, deduplicates, and retrieves current source state
Orient   source owner, Attention, Agent Context, trust, and purpose build a view
Decide   agent, operator, and Run policies select the response and delivery timing
Act      AR and tools execute through authorized application commands
Feedback typed domain outcomes start a new observation cycle
```

One semantic source change may emit two independent facts:

- `ContextSourceInvalidated` says a previously usable contribution may be stale;
- `AttentionCandidate` says a recipient may need to act or re-orient now.

Attention suppression never hides invalidation. Invalidation never grants wake or
interrupt authority. Frequent source changes are coalesced; they do not rebuild a
manifest per webhook. Missing or out-of-order vendor events are repaired through
current-state retrieval and periodic reconciliation.

## Freshness and disclosure

There is no globally atomic snapshot across bounded contexts. Every manifest
records a `SourceRevisionVector`; critical tool actions re-check relevant
preconditions immediately before committing an external effect.

Each contribution candidate records at least:

```text
source identity and revision
observedAt, validUntil, maxAge, and freshness requirement
authorization revision
content hash and exact disclosed artifact reference
authority, trust, taint, and confidentiality
retention and deletion policy
required or optional disposition
transformation and omission reasons
```

References alone are insufficient for audit because source content can later
change. Copying a source aggregate is also forbidden. The candidate compromise is
an encrypted, retention-governed contribution artifact containing exactly what was
disclosed, tied to source revision and hash. Secrets remain opaque `secretRef`
values and are resolved only at an authorized execution boundary.

Invalidation includes source mutation or deletion, access revocation, trust or
egress change, assignment or objective change, instruction supersession,
provider/capability change, budget change, and Attention retraction. An immutable
manifest is never edited in place; invalidation records impact and may create a
successor.

## Manifest and instruction draft

A candidate manifest includes schema and composition versions, lineage and parent
identity, purpose and audience, ordered contributions, source revision vector,
policy and capability snapshots, budget reservation, validity constraints,
omission evidence, checkpoint base, and a deterministic fingerprint.

Instruction authority is explicit rather than text-order folklore:

```text
managed constraints
product protocol
organization, team, and role modules
workspace and path-scoped instructions
Work-specific instructions
latest authorized user turn
untrusted evidence and retrieved data
```

Untrusted content cannot promote itself to instruction. A model-generated summary
cannot increase authority, remove taint, approve an action, or assert completion.
Hard invariants remain code. Stable instruction prefixes may be compiled to exploit
provider caching, but cache identity never becomes domain identity.

The minimal first context is a mandatory spine: identity, current purpose, hard
constraints, active Work, latest user turn, unresolved commitments and approvals,
policy summary, and an index for progressive retrieval. Optional material is
summarized or represented by typed handles and disclosed just in time.

## Budget draft

Context fit accounts for input tokens, reserved output, tool schemas, files and
media, provider overhead, fetch latency, and policy constraints. Consumption
Governance supplies monetary and quota decisions; Agent Context allocates the
available request budget; AR supplies model-specific counting and actual usage.

Required content that cannot fit produces `ContextBudgetExceeded` or an explicit
downgrade decision. It is never silently character-sliced or dropped. Token count
is model- and compiler-specific evidence, not an invariant exact quantity.

## Checkpoint and provider-switch draft

`NativeCheckpoint` is an opaque provider/runtime continuation usable only within a
compatible technical and security scope. `SemanticCheckpoint` is portable and
contains objective, constraints, verified decisions, evidence references,
completed and pending Work, source cursors, unresolved approvals, and explicit
omissions.

Compaction freezes the source vector, builds a deterministic skeleton from
authoritative contexts, optionally adds a model-generated narrative, validates
identities and states, and stores a checkpoint boundary without replacing raw
history. Rehydration uses the checkpoint plus fresh source deltas, current mandatory
modules, and permitted retrieval.

Provider switch classifies contributions as portable, transformable, not portable,
or prohibited; rechecks trust and egress; obtains new capabilities and budgets;
creates a successor manifest; and records a `ContinuityGrade` plus `LossReport`.
Hidden reasoning, native tool-call identity, provider cache, opaque compaction, and
provider-local approval state do not transfer as semantic truth.

## Context application evidence

Candidate evidence stages are:

```text
manifest-prepared
runtime-accepted
materialized
partially-materialized
rejected
application-outcome-unknown
```

Evidence records manifest and contribution hashes, runtime session or operation
reference, execution epoch, provider/model/compiler versions, applied and omitted
contributions, token evidence, and reason codes. `Materialized` means included in a
provider request or active context. It never claims that a model read, understood,
or followed the content.

Unknown outcomes are reconciled by stable Context Application identity and AR
query capability. Blindly injecting the same contribution again can duplicate a
user instruction and is forbidden without reconciliation or controlled recovery.

## First slice and deferred complexity

The first vertical slice should prove one Work contribution, one Conversation
contribution, one managed instruction module, one immutable manifest, one AR
materialization adapter, one receipt, one invalidation, and one rehydration path.

Do not initially build a separate microservice, mandatory vector database,
universal merge DSL, full branch graph, event sourcing of all context state, or
provider-specific connectors inside this context. These remain optional adapters
or later models after measured use cases prove them.

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
- A manifest records a source revision vector rather than claiming a globally
  atomic cross-context snapshot, and application preconditions can be revalidated.
- AR returns a typed materialization report for applied, dropped, downgraded,
  delegated, or rejected contributions.
- Required context fails explicitly when it cannot fit or cannot be enforced.
- Compaction and resume rehydrate current semantic context rather than replaying an
  old prompt byte-for-byte.
- Revocation distinguishes future nondisclosure from content already disclosed to
  a provider and produces an explicit remediation decision.
- Provider switch, runtime replacement, fork, concurrent refresh, and stale receipt
  scenarios have deterministic revision and fencing behavior.
- Exact disclosed artifacts have retention, encryption, redaction, and privacy
  deletion behavior without copying source aggregates.
- Invalidation storms, feedback loops, lost connector events, and
  application-outcome-unknown states have bounded recovery and observability.
- The first prompt can remain minimal while identity, trust, current purpose, Work
  discovery, inbox discovery, and mandatory instructions remain reliable.

## Resolution

Open. When resolved, set `status: resolved` and link the deciding ADR.
