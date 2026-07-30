---
id: OD-028
type: open-decision
status: open
owner: architecture/domain
summary: Decide Agent Context ownership, lifecycle, manifests, checkpoints, and runtime materialization boundary.
blocked_by:
  - OD-006
  - OD-026
  - OD-029
  - OD-031
  - OD-032
related:
  - ADR-0068
  - architecture.context-map
  - architecture.runtime-boundary
  - domain.contexts.run-orchestration
  - OD-004
  - OD-006
  - OD-026
  - OD-029
  - OD-031
  - OD-032
  - OD-033
  - research.pre-implementation-gate-critique-2026-07-30
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
ContextBasis
ContextContractSnapshot
ContextValidityAssessment
RepresentationArtifact
ContextMaterializationPlan
ContextActivationRef
OrientationReceipt
ContinuityGrade
LossReport
```

These are discovery candidates, not accepted aggregate names.

## Fixed boundary constraints

- Source contexts remain authoritative for Work, Message, Topology, Memory, Policy,
  and other product facts. Context planning cannot copy their aggregates.
- Hard product invariants remain domain/application code and never rely on prompt
  obedience.
- Access Control owns grants, delegation, revocation, and product authorization.
  Policy and Risk owns risk, approval requirements, automation limits, and egress
  policy. Consumption Governance owns monetary budgets and quotas. Context
  planning consumes their decisions.
- Run Orchestration remains the only product owner that commands execution and
  decides whether to continue, pause, restart, replace a runtime, or activate
  context for an action-capable runtime generation.
- AR owns provider formatting, roles, tokenization, native cache and compaction
  mechanics, provider-session state, and actual materialization.
- Context application is not an AR `RuntimeOperation` and does not imply a model
  turn. A declared no-turn application that produces assistant or tool output is
  a typed materialization anomaly.
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
- Agent Context may prove semantic readiness, but it cannot authorize a product
  action, wake a runtime, or command AR.

## Current draft hypothesis

A separate Agent Context bounded context inside the modular monolith is the
leading candidate. It owns verified composition of versioned contributions, not
all information known by an agent. It has its own application, domain,
persistence, inbox, outbox, and Published Language boundaries, but does not become
a separately deployed service in the first version.

The candidate owns:

- source selection, provenance, context basis, and composition;
- instruction classification, precedence, conflict detection, and disclosure;
- multidimensional context budgeting and required-content fit;
- immutable manifests and portable semantic checkpoints;
- freshness, invalidation, and successor planning;
- semantic readiness and materialization evidence intake;
- provider-neutral continuity and explicit provider-switch loss reporting.

Source ownership remains outside this context:

- Work owns tasks, comments, dependencies, and lifecycle;
- Agent Communication owns messages, participants, and Conversation history;
- a future Memory capability, if accepted, owns its own facts, evidence,
  confidence, expiry, and supersession rather than donating that ownership to
  Agent Context;
- Agent Attention owns agent-specific relevance, novelty, coalescing, expiry,
  orientation need, and bounded disruption intent;
- the still-unaccepted integration boundary owns connector installation, vendor
  authentication, webhook cursors, raw dedupe, and reconciliation only after
  event storming and context-map acceptance;
- Access Control owns grants, delegation, revocation, and authorization decisions;
- Policy and Risk owns trust, risk, approval requirements, automation, and egress
  decisions;
- Consumption Governance owns money and quota;
- Run Orchestration owns execution authority and runtime lifecycle decisions;
- AR owns provider sessions, tokenizer and capability observations, compilation,
  native context mechanics, and actual technical materialization.

## Candidate model

```text
ContextLineage          logical continuity across Runs and providers
ContextBinding          selected source-scope references for a purpose
ContextContractSnapshot immutable purpose-relative requirements
ContextManifest         immutable content-addressed composition artifact
ContextContribution     exact disclosed derived artifact and source provenance
RepresentationArtifact exact, extract, translation, summary, or retrieval index
ContextValidityAssessment current purpose-relative usability evaluation
SemanticCheckpoint      portable verified continuity artifact
NativeCheckpoint        opaque AR/provider continuation reference
MaterializationReport   evidence returned by AR
OrientationReceipt      bounded public explanation of readiness and omissions
```

`ContextBranch` remains a reserved candidate rather than a first-version
aggregate. `lineageId`, `parentManifestId`, and an optional branch reference
preserve future compatibility until fork, review, speculation, or rollback proves
a real concurrent-branch invariant. Compaction alone does not create a branch.

An immutable manifest is not a giant aggregate. A small lineage aggregate governs
continuity and successor rules; exact disclosed artifacts, manifests, and
checkpoints are immutable records. Runtime activation and ambiguous application
outcomes belong to a Run-owned process, not to the Agent Context aggregate.

`ContextBinding` records selected source scopes and references current Access
Control decisions. It does not grant access. `ContextValidityAssessment` records
evidence for a purpose and moment; the owning use case still decides whether an
action is authorized.

## Separation against god objects

`ContextManifest` is an immutable bill of materials, not an aggregate, policy
engine, current-state cache, provider prompt, authorization decision, or
understanding receipt. It identifies selected contributions, representations,
omissions, conflicts, basis, contract and composition versions, and validity
constraints.

Purpose requirements live in a separate immutable `ContextContractSnapshot`.
Current applicability lives in a vector-valued `ContextValidityAssessment`.
Runtime activation and ambiguous outcome recovery live in a Run-owned
`ContextActivationProcess`. Provider formatting, tokenization, native caching,
and compaction remain in AR.

The candidate feature split inside Agent Context is:

```text
context-bindings
context-contracts
contribution-intake
derived-representations
manifest-assembly
validity-and-invalidation
materialization-evidence
checkpoints-and-rehydration
```

These are cohesive feature candidates, not mandatory empty folders. Shared code
may contain only proven technical primitives. There is no central manifest
compiler that imports every source context.

Manifest internals do not become public SDK models. A future public surface may
expose a bounded `OrientationReceipt`: why the Run re-oriented, purpose and Work
revision, freshness and coverage summary, unresolved conflicts, omissions,
superseded instructions, and retrieval handles. Exact composition, hashes,
taint graphs, source positions, provider envelopes, and native checkpoints remain
private.

## Observation and OODA draft

OODA describes collaboration among contexts, not a new aggregate, bounded
context, or workflow engine. OD-033 owns the unresolved convergence and
activation process:

```text
Observe  source adapters verify, deduplicate, and retrieve current source state
Orient   semantic owners and Agent Context build purpose-relative evidence
Decide   owning application use cases, operator, and Run choose an authorized act
Act      the owning use case performs product effects; AR enforces runtime effects
Feedback typed owner facts pass through admission before a new cycle
```

One semantic owner publishes one producer-owned fact, such as
`TaskCommentAdded`. Independent consumer ACLs may translate that fact into local
commands such as `InvalidateContextContribution` and
`AdmitAttentionObservation`. Source contexts never publish downstream-specific
context or attention candidates.

Human notification suppression never hides context invalidation or Agent
Attention. Context invalidation never grants wake or interrupt authority.
Frequent source changes are coalesced; they do not rebuild a manifest per webhook.
Missing or out-of-order vendor events are repaired through current-state retrieval
and periodic reconciliation.

Stateful sources converge on their latest head rather than replaying every
change. The reconciliation record must distinguish desired, claimed, and applied
generations so an older completion cannot clear a newer wake-up:

```text
durable integration receipts
  -> SourceHead desiredGeneration + sourceIncarnation
  -> claim claimedGeneration + leaseEpoch
  -> bounded current-state reconciliation
  -> appliedGeneration through compare-and-swap
  -> semantic-owner fact
```

Every source contract declares either `state-head` convergence or
`discrete-ledger` delivery. Discrete comments, messages, approvals, revocations,
withdrawals, and security facts are not coalesced.
Safety, source reconciliation, context assembly, and external-action work require
independent capacity lanes so a noisy source or tenant cannot starve revocation or
fencing. This is workload isolation, not a global OODA coordinator.

## Freshness and disclosure

There is no globally atomic snapshot across bounded contexts. Every manifest
records a `ContextBasis`; critical tool actions re-check relevant preconditions
immediately before committing an external effect.

`ContextBasis` is a set of opaque, source-owned positions plus purpose scope,
owner-issued coverage evidence, known gaps, and admission or authorization
evidence references. Revisions are comparable only within the same source
lineage. It is not a vector clock and claims no causal ordering across Jira,
Notion, Conversation, Work, Policy, or another context. A list of observed
records alone never proves that the requested scope is complete.

Hot-source invalidation updates a source head or validity epoch instead of
rewriting every historical manifest. Active Runs receive bounded invalidation
signals; inactive manifests are assessed lazily when reused.

Each contribution candidate records at least:

```text
source identity and revision
observedAt, validUntil, maxAge, and freshness requirement
authorization revision
content hash and exact disclosed artifact reference
source authenticity, semantic authority evidence, trust, taint, and confidentiality
retention and deletion policy
required or optional disposition
transformation and omission reasons
```

References alone are insufficient for audit because source content can later
change. Copying a source aggregate is also forbidden. The candidate compromise is
an encrypted, retention-governed contribution artifact containing exactly what was
disclosed, tied to source revision and hash. Secrets remain opaque `secretRef`
values and are resolved only at an authorized execution boundary.

Semantic invalidation includes source mutation or deletion, access revocation,
trust or egress change, assignment or objective change, and instruction
supersession. Provider, capability, or budget change invalidates target fit or
activation, not necessarily semantic composition. Attention retraction cancels a
delivery or interruption intent; it does not make a source fact stale. An
immutable manifest is never edited in place.

## Manifest and instruction draft

A candidate manifest includes schema and composition versions, lineage and parent
identity, purpose and audience, selected contributions and precedence outcomes,
context basis, omission and conflict evidence, checkpoint base, and a
deterministic fingerprint. Current authorization, risk, budget, target
capability, token count, runtime identity, and provider ordering remain external
evidence or activation concerns rather than fields that turn the manifest into a
semantic compiler.

Content identities and fingerprints are tenant-scoped. Raw or low-entropy
protected content never uses a public unkeyed hash as a global deduplication
identity.

Validity is purpose-relative and vector-valued rather than one state that mixes
different owners:

```text
coverage: complete | incomplete | indeterminate
freshness: current | stale | indeterminate
disclosure: eligible | forbidden | remediation-required | indeterminate
semantic-fit: complete | degraded | incomplete | conflicted
target-fit: fits | reduction-required | rejected | unknown
activation: inactive | active | superseded | outcome-unknown
```

A `ContextContractSnapshot` declares required and advisory clauses, acceptable
representations, freshness, conflict, disclosure, risk, and fit behavior. Required
content cannot silently become a summary, retrieval handle, omission, or truncated
text. `COMPLETE_FOR_PURPOSE` may be derived only when each required clause has
satisfaction evidence and source-owner coverage is complete. A retrieval handle
satisfies only a clause that explicitly allows on-demand availability. A conflict
remains visible until its semantic owner resolves it.

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

Every instruction contribution also declares scope, source, revision,
`supersedes`, expiry, and conflict behavior. Same-level contradictions remain
explicit; list order does not resolve them. Summaries, translation, retrieval,
memory, and compaction preserve derivation edges and cannot lower effective taint
or raise authority without a separately attested sanitized artifact.

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

Compaction freezes the context basis, builds a deterministic skeleton from
authoritative contexts, optionally adds a model-generated narrative, validates
identities and states, and stores a checkpoint boundary without replacing raw
history. Rehydration uses the checkpoint plus fresh source deltas, current mandatory
modules, and permitted retrieval.

Provider switch classifies contributions as portable, transformable, not portable,
or prohibited; rechecks trust and egress; obtains new capabilities and budgets;
creates a new Run-owned activation and records a `ContinuityGrade` plus
`LossReport`. It creates a successor semantic manifest only when semantic
composition changes.
Hidden reasoning, native tool-call identity, provider cache, opaque compaction, and
provider-local approval state do not transfer as semantic truth.

Run must quiesce the old action-capable runtime, checkpoint recoverable state,
prepare the target, fence the old runtime, and only then activate the target.
Two action-capable runtime generations for one Run authority generation are
forbidden. Offline or queued activation always repeats freshness, authorization,
deletion-epoch, and target-fit assessment before dispatch.

## Runtime materialization evidence

OD-033 owns the unresolved Run activation state machine, resume gate, and
supersession behavior. Agent Context owns only the semantic input and evidence
contract needed by that process. The contract must distinguish full, partial,
rejected, superseded, remediation-required, and unknown materialization outcomes
without defining Run lifecycle transitions inside Agent Context.

Evidence records manifest and contribution hashes, runtime session or operation
reference, observable AR execution epoch, Run authority generation,
provider/model/compiler versions, applied and omitted contributions, token
evidence, and reason codes. Private AR fences never leave AR. `Materialized`
means included in a provider request or active context. It never claims that a
model read, understood, remembered, or followed the content.

Unknown outcomes require the Run-owned reconciliation defined by OD-033 and AR
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
   optional contributions, composition version, hashes, sensitivity, freshness,
   coverage, known gaps, and expiry.
- A manifest records a `ContextBasis` of opaque source-lineage positions rather
  than claiming a globally atomic snapshot or cross-source causal clock.
- Contract, manifest, current validity, representation, and Run-owned activation
  remain separate models with separate owners and lifecycles.
- Hot-source invalidation does not require rewriting historical manifests or
  synchronously rebuilding every dependent Run.
- Public SDK contracts do not expose manifest internals, provider compilation, or
  adapter-native context state.
- AR returns a typed materialization report for applied, dropped, downgraded,
  delegated, or rejected contributions.
- Required context fails explicitly when it cannot fit or cannot be enforced.
- Compaction and resume rehydrate current semantic context rather than replaying an
  old prompt byte-for-byte.
- Revocation distinguishes future nondisclosure from content already disclosed to
  a provider and produces an explicit remediation decision.
- Deletion epochs are checked during rehydrate, restore, replay, delayed
  activation, and provider switch so erased content cannot be resurrected.
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
