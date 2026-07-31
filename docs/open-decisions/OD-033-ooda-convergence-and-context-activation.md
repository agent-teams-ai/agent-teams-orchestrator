---
id: OD-033
type: open-decision
status: open
owner: architecture/domain
summary: Define cross-context OODA convergence, attention-to-context activation, safe resume, feedback control, and scale behavior without a global coordinator.
blocked_by:
  - OD-005
  - OD-006
  - OD-013
  - OD-026
  - OD-027
  - OD-028
  - OD-031
  - OD-032
related:
  - ADR-0068
  - architecture.eventing
  - architecture.runtime-boundary
  - domain.contexts.run-orchestration
  - OD-005
  - OD-006
  - OD-013
  - OD-026
  - OD-027
  - OD-028
  - OD-031
  - OD-032
---

# OD-033: OODA Convergence and Context Activation

## Decision required

Define how independently owned observations converge into a current orientation,
how attention becomes a safe Run-owned activation, and how feedback starts a new
cycle without one global OODA service, manifest god-object, or duplicated
business authority.

OODA is an architectural collaboration pattern. It is not a bounded context,
aggregate, transport, queue, workflow engine, or claim that an LLM understood
context.

## Fixed boundary constraints

- Source owners remain authoritative for their facts and issue coverage or gap
  evidence for requested scopes.
- The context owner selected by OD-028 composes semantic manifests and readiness
  evidence. It does not wake runtimes, authorize product actions, or command AR.
- Agent Attention owns agent-specific relevance, orientation need, and bounded
  disruption intent. It does not own source freshness or Run authority.
- Run Orchestration owns the process that binds one manifest and its current
  decisions to one action-capable runtime generation.
- Product side effects enter the owning feature use case. AR owns technical
  runtime application, process, tool, sandbox, and capability enforcement.
- A model proposal is advisory. It never becomes a decision, acknowledgement,
  authorization, or domain fact without the owning application boundary.
- No cross-context database transaction, shared aggregate, global validity
  revision, or universal OODA queue is introduced.

## Leading process split

```text
Observe
  source adapter receipt
  -> authenticity, dedupe, retrieval, and source-owner admission

Orient
  source positions + coverage + conflicts + current owner decisions
  -> immutable semantic manifest + vector-valued validity assessment

Decide
  agent or operator proposal
  -> feature-owned use case + Access/Policy/Approval decisions

Activate
  Attention intent or explicit Run need
  -> Run-owned ContextActivationProcess
  -> AR materialization and classified outcome

Act
  feature-owned command
  -> last-mile checks from OD-032

Feedback
  typed owner fact
  -> claim admission, causation limits, and next observation
```

The activation process must bind:

```text
activationId
runId and RunAuthorityGeneration
purpose and Work revision
manifestRef and validityAssessmentRef
attentionIntentRef or explicit wake reason
runtimeSessionRef and observable AR execution epoch
required authorization, policy, approval, budget, and deletion evidence refs
deadline, downgrade policy, and current state
```

It stores coordination state and opaque references only. It never imports source
aggregates, AR models, or another context's authorization rules.

## Wake-after-orient and resume gate

A wake or interrupt cannot race ahead of the context it requires. The candidate
flow is:

```text
attention accepted
  -> desired orientation recorded
  -> source heads and coverage reconciled
  -> semantic manifest becomes ready
  -> Run claims activation for its current authority generation
  -> pre-dispatch safety and deletion checks
  -> AR materialization
  -> classified outcome
  -> wake, safe-point resume, downgrade, or hold
```

Before any action-capable resume, a `ResumeGate` reconciles Run authority, Work
state, pending attention, source gaps, context validity, deletion epoch, and the
last materialization outcome. Tool execution remains fenced until the gate
produces an accepted activation or an explicit read-only or paused outcome.

No receipt may state that the model read, understood, remembered, or followed the
context. A public `OrientationReceipt` is a bounded explanation containing why
orientation changed, relevant purpose and Work revision, freshness and coverage
summary, conflicts, omissions, superseded instructions, continuity impact, and
retrieval handles.

## Convergence and load

Every observation contract declares one mode:

- `state-head`: converge to current state with separate desired, claimed, and
  applied generations, source incarnation, lease epoch, and compare-and-swap;
- `discrete-ledger`: preserve every admitted fact and detect gaps before applying
  a safety-sensitive successor.

Revocations, withdrawals, approvals, comments, and messages are not silently
coalesced. Stateful vendor objects may coalesce intermediate updates only when
the source owner can retrieve and attest the complete current head.

The execution profile needs:

- independent safety, source-reconciliation, context-assembly, activation, and
  external-action lanes;
- tenant and ordering-key fairness rather than one FIFO;
- reserved database, disk, broker, and downstream capacity for safety work;
- semantic no-op fingerprints, single-flight assembly, bounded debounce, jitter,
  and cohorts to prevent fanout storms;
- one in-flight publication per ordered key or an explicit consumer gap and
  reorder protocol;
- inbox reuse detection whose horizon covers replay, outage, and topology
  migration, or a fail-closed old-replay outcome.

Exact scheduling, quotas, and cell placement remain open. Local and hosted
profiles must preserve the same application outcomes even when capacity differs.

## Feedback-loop controls

Every automated feedback item carries bounded causation metadata:

```text
correlationId
causationId
automationDepth
sourceOwner
semanticFingerprint
producedByPolicyVersion
```

Repeated semantic no-ops are suppressed. Cycles, depth limits, oscillating
instructions, and source-to-notification-to-context feedback are detected and
reported. Summaries, memory, compaction, and translations preserve provenance and
cannot launder taint or authority.

## Evolution and operator evidence

The design must version independently:

- source and contribution contracts;
- canonicalization and fingerprint rules;
- context contracts and manifests;
- representation transformers;
- validity and explanation models;
- activation protocol and materialization reports;
- semantic checkpoints and upcasters.

A stable business process identity does not include a contract version. An
incompatible workflow replacement uses an explicit successor generation,
handoff, and fence rather than creating a second owner for the same Run.

Replay has three distinct modes:

1. historical reproduction using recorded model and external outcomes;
2. current-policy reevaluation over retained inputs;
3. counterfactual simulation with new model calls marked non-authoritative.

Migration from the legacy giant prompt requires inventory and precedence
mapping, shadow manifest generation, comparison evidence, session pinning,
read-only canaries, guarded action canaries, rollback, and a corpus proving that
required commitments survive compaction and resume.

## Decisions still open

1. Exact aggregate and process boundary for Run-owned context activation.
2. Exact source integration ownership and source-head contract.
3. Instruction conflict, path-scope, correction, and supersession semantics.
4. Safety watermark and gap policy for revocation-sensitive actions.
5. Fair scheduling, overload admission, and cell placement or transfer protocol.
6. Privacy-preserving evidence retention, crypto-erasure, and backup behavior.
7. Initial OODA SLIs, evaluation corpus, and accepted targets.

## Options

1. Separate Agent Context plus accepted Agent Attention and Run-owned activation
   process. This is the leading option.
2. Agent Context as a focused feature inside Run Orchestration, with accepted
   Agent Attention remaining separate and the same ports and owner rules.
3. One global OODA coordinator owning observation, context, decisions, and action.
   This is not viable because it duplicates semantic owners and creates a
   cross-context god-component.

## Acceptance criteria

- event storming covers external edits, comments, direct and group messages,
  revocation, deletion, offline agents, provider switch, compaction, stale
  activation, unknown outcome, and feedback loops;
- no wake or action-capable resume can outrun required context activation;
- stale workers, old source reconciliation, and old runtime generations cannot
  overwrite a newer desired state;
- safety-sensitive gaps fail closed and have bounded reconciliation;
- one noisy source or tenant cannot starve revocation, fencing, or another tenant;
- operator evidence explains why an action was allowed, blocked, downgraded, or
  left unknown without exposing private manifest contents;
- mixed-version, failover, overload, and replay fixtures prove deterministic
  behavior before Temporal or multi-cell deployment.

## Resolution

Open. The leading option requires one embedded vertical slice, one external
integration slice, failure injection, and shadow comparison against the legacy
prompt flow before an ADR accepts aggregate or deployment boundaries.
