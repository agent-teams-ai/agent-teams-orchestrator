---
id: architecture.evolution-quality-attributes
type: architecture
status: accepted
owner: architecture/governance
summary: Normative quality attributes and review rules for long-term orchestrator evolution.
related:
  - ADR-0043
  - ADR-0042
  - ADR-0114
  - architecture.deployment-profiles
  - architecture.overview
  - architecture.testing
---

# Evolution and Quality Attributes

## Horizon

The orchestrator is designed as a long-lived product and platform, not a temporary
frontend backend or a provider-specific launcher. Architecture must remain usable
across many runtimes, local and hosted deployments, multiple clients and languages,
multi-tenancy, and future bounded-context extraction.

The [service role map](deployment-profiles.md#service-role-map) commits the
coarse process boundaries, while the
[concurrent execution target](deployment-profiles.md#concurrent-execution-target)
owns the minimum useful and enterprise deployment goals. First owning features
establish those boundaries rather than leaving extraction to a later reminder.
This horizon changes the required evidence; it does not permit speculative
abstractions without an owner.

## Priority quality attributes

When qualities conflict, preserve correctness, security, and recoverability before
convenience or local implementation speed. Every significant design explains its
trade-offs across:

1. **Correctness**: one authority for each invariant and mutation.
2. **Recoverability**: durable intent, idempotency, reconciliation, and explicit
   ambiguous outcomes.
3. **Security and privacy**: least authority, tenant isolation, redaction, and
   auditable decisions.
4. **Evolvability**: focused contexts, feature ownership, replaceable adapters, and
   controlled migrations.
5. **Interoperability**: strict versioned contracts and idiomatic SDKs without
   leaking internal models.
6. **Operability**: health, diagnostics, observability, bounded resource use, and
   deterministic lifecycle.
7. **Performance and scale**: measured partitioning, backpressure, pagination, and
   extraction without weakening the preceding attributes.

## Required evidence

A durable abstraction, extension point, package, service, or context needs:

- a named owner and consumer;
- a concrete variation, invariant, lifecycle, policy, or failure boundary;
- an allowed dependency direction;
- replacement or extraction semantics when replaceability is claimed;
- conformance tests for behavior shared by multiple implementations;
- a migration and compatibility strategy for persisted or public state;
- the accepted role placement and first-materialization process evidence;
- operational qualification before advertising a distributed deployment.

Two similar classes or a possible future integration are not sufficient evidence.
Conversely, implementation convenience cannot collapse models with different
language, authority, security, or consistency.

## Evolution rules

- Domain and application behavior never branch on provider, transport, database,
  process host, or local-versus-hosted labels.
- Every public or cross-context contract starts with one version and evolves
  compatibly until a reviewed migration requires another.
- Persisted state has an owner, schema history, backup and recovery behavior, and
  an explicit deletion policy.
- Extraction replaces an adapter or composition boundary; it does not copy domain
  authority into a second service.
- Performance shortcuts cannot bypass authorization, idempotency, validation,
  ordering, or tenant scope.
- A superseding decision records why earlier evidence no longer applies.

## Review questions

Before accepting a design, ask:

1. Which model and lifecycle does it own?
2. What concrete future change can occur without changing the domain?
3. Which failure and ambiguous outcomes can occur?
4. How is state migrated, recovered, deleted, and audited?
5. How do local and hosted implementations prove equivalent semantics?
6. Can another context or adapter evolve without importing internals?
7. Is each abstraction justified today, or is it only speculative symmetry?

## Evolution-readiness application (design guidance)

The organization [evolution-readiness proposal](https://github.com/agent-teams-ai/.github/blob/ea13fbfc7965fce16d9af3c4d7cf8dcca6ff6d29/docs/architecture/evolution-readiness.md)
is a common authoring and evidence route, not acceptance of additional
Orchestrator features. Apply it at actual owning boundaries without relaxing
the accepted composition/admission requirements.

| Boundary | Preserve in the first dependent design | Stronger profile only when selected |
| --- | --- | --- |
| Run and Task execution | Stable execution identity, effective behavior/configuration references and original effect receipts | In-flight behavior changes or replay where provider guarantees permit |
| Agent Context and extensions | Consumer-owned ports, typed assembly, inert declarations, explicit custody | Qualified LMU live replacement, retained streams and current receiver authority |
| Project/Team/Work | Canonical owner, versioned mutations and transfer/deletion semantics | Offline drafts or merge of explicitly classified non-authoritative user data |
| External providers and policy | Scoped actor, subject, grant and receiver enforcement | Workload federation, separate rollout cohorts |
| Task verification and review | Versioned criteria/evidence, observable cost/outcome and bounded test effects | Shadow/canary evaluation without duplicate side effects |

Use existing owners and ADRs (including OD-028/029/043 and Run/evaluation
owners as applicable); do not create a generic configuration/rollout manager,
another plugin loader or a universal sync engine. Reuse qualified GM, EF,
LMU and Foundation evidence; keep domain assertions local. Test the selected
profile with a deliberate rejecting case (e.g. stale grants, retained old
work, incompatible state or failed evaluation). The ordinary static first
slice does not wait for unselected dynamic/offline/federated profiles.
