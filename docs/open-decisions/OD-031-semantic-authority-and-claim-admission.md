---
id: OD-031
type: open-decision
status: open
owner: architecture/domain
summary: Define source authenticity, semantic authority, typed claim admission, delegation, and conflict resolution without a central authority god-context.
blocked_by:
  - OD-006
  - OD-012
related:
  - architecture.context-map
  - architecture.security
  - domain.contexts.access-control
  - domain.contexts.identity-registry
  - domain.contexts.policy-risk
  - OD-012
  - OD-006
  - OD-028
  - OD-032
  - OD-033
---

# OD-031: Semantic Authority and Claim Admission

## Decision required

Define how an external observation becomes an admitted domain fact when multiple
users, agents, integrations, automations, and delegated authorities can disagree.
The model must preserve source provenance, authorization, domain ownership,
conflicts, revocation, and multi-tenant isolation without one global authority
service deciding every business meaning.

## Fixed boundary constraints

The stages are separate:

```text
external payload
  -> source authenticity assessment
  -> typed claim
  -> access authorization decision
  -> semantic-owner claim admission
  -> domain mutation or ConflictCase
  -> optional ContextContribution
```

- The configured product authority provider owns external principal and identity
  binding facts; exact Orchestrator principal-binding ownership remains OD-012.
- The still-unaccepted integration boundary owns installation identity, source
  incarnation, signature verification, deduplication, compromise, and retrieval
  only after event storming and context-map acceptance.
- The configured product authority provider owns grants, delegation, revocation,
  and authorization decisions consumed through feature-owned ports.
- The semantic owner owns typed claims, authority bindings for its semantic
  facets, domain invariants, conflict resolution, and accepted facts.
- Policy and Risk owns risk, approval requirement, and automation constraints.
- Agent Context owns provenance-aware composition and validity, not business
  truth.
- Authentication proves who sent data. A valid signature does not prove that
  content is true, safe, current, authorized for a mutation, or instruction.
- Provenance is evidence, not authority.
- A payload `producer` field is not provenance. The inbound adapter binds the
  authenticated transport principal, accepted route or subject, schema owner,
  tenant scope, and source incarnation before claim admission and rejects
  producer spoofing.
- A message, comment, summary, model output, or telemetry item is advisory until a
  typed command or claim passes the owning use case.
- Cross-source last-write-wins is prohibited. Unresolved disagreement remains an
  explicit conflict.

No separate `Authority Governance` bounded context is introduced now. A new
context becomes justified only if cross-domain mandate administration develops
its own users, language, invariant-rich lifecycle, policies, and independently
deployable capability. Until then it would duplicate the configured authority
provider and semantic owners.

## Leading model

Candidate owner-specific language:

```text
TypedClaim
SemanticFacet
AuthorityBinding
ClaimCase
ClaimAdmissionDecision
ConflictCase
ClaimProvenance
SourceIncarnationRef
DelegationDecisionRef
AuthorizationDecisionRef
```

The `*Ref` terms are opaque evidence references owned by the consuming semantic
context. They do not duplicate integration or authority-provider state.

`SemanticFacet` is defined and versioned by its owner, for example
`work.task.lifecycle.v1`. It is not a global free-form namespace or universal JSON
claim. Authority modes may include:

- exclusive authority with non-overlapping active bindings;
- quorum over independent trust roots;
- multi-source evidence with explicit conflict;
- advisory evidence that cannot mutate the fact directly.

Delegation cannot expand the parent scope, actions, purpose, duration, or ability
to delegate. Further delegation is disabled by default, depth-bounded,
cycle-safe, revocable, and versioned.

Rebinding an external source creates a new source incarnation. Old observations
never inherit the new binding's trust. Rollback activates old policy content under
a new monotonic activation revision rather than moving revisions backward.

An authority matrix may be exposed as a query projection for operators. It is not
the write authority or canonical policy store.

## Scale and consistency hypothesis

Authorization reads will be much more frequent than grant writes, so bounded
version-aware caches, request memoization, and batch checks are allowed behind
ports. Revocation and fencing need a reserved safety lane and cannot wait behind
ordinary source backlog.

Hosted mutation authority is partitioned by tenant and stable scope root. A
partition has one authoritative home region and monotonic failover epoch.
Cross-context revisions remain opaque and incomparable. Critical checks require
at-least-as-fresh evidence for the relevant owner rather than one global revision.

Raw source payloads do not enter provenance graphs, integration events, or audit
logs. They use classified encrypted content references. Safe provenance records
contain opaque identities, source lineage, derivation edges, classification,
revisions, and approved fingerprints.

Derivation remains explicit through summaries, translations, compaction, memory,
checkpoints, and tool proposals. A derived artifact cannot lower effective taint,
raise semantic authority, or erase a conflict unless the semantic owner issues a
separate typed admission or sanitization decision.

## Decisions still open

1. Exact aggregate boundaries for owner-specific `AuthorityBinding`,
   `ClaimCase`, and `ConflictCase`.
2. Initial authority modes and which business capabilities require quorum.
3. Authorization consistency tokens, cache freshness, and multi-region failover.
4. Whether Cedar, OpenFGA, SpiceDB, or another engine is useful behind a
   configured authority adapter; no engine model may leak into domain code.
5. Conflict operator UX, expiry, supersession, and escalation.
6. Provenance storage, tenant-scoped keyed fingerprints, retention, and erasure.
7. Shadow-mode migration from legacy implicit authority.
8. Exact source-integration boundary and ownership of installation, incarnation,
   webhook cursor, compromise, and reconciliation semantics.

## Options

1. Feature-owned semantic authority with configured product authority decisions
   and provenance-aware claim admission. This is the leading option.
2. A separate Authority Governance bounded context after independent domain
   evidence exists.
3. A static global authority matrix. This is not considered viable for
   delegation, quorum, rebinding, conflicts, and multi-region operation.

## Acceptance criteria

- no service or aggregate owns source authenticity, access authorization, policy
  risk, semantic truth, and context composition together;
- every mutable claim has a typed owner, scope, provenance, authorization
  revision, semantic admission outcome, and idempotency identity;
- cross-source conflicts cannot be hidden by timestamp ordering;
- delegation, source rebinding, compromise, revoke, and policy rollback have
  deterministic monotonic behavior;
- high-risk authorization fails closed under an unknown or stale safety state;
- tenant isolation and no-cross-tenant property tests cover caches, indexes,
  conflict resolution, and explanations;
- migration supports shadow evaluation and discrepancy evidence before a legacy
  write path is removed.

## Resolution

Open. The leading hypothesis must be proved through event storming for at least
Work lifecycle, Conversation input, and one external integration before an ADR
fixes aggregate boundaries or an authorization engine.
