---
id: research.agent-harness-industry-design-review-2026-11-02
type: research
status: active
owner: architecture
summary: Evidence-led comparison of autonomous agent harnesses and orchestrators with Agent Teams architecture, alternatives, adversarial reviews, and decision boundaries.
---

# Agent harness and orchestration industry review (2026-11-02)

## Scope and decision authority

This is a **research record**, not an accepted ADR, implementation admission, qualification receipt, or authorization to change accepted architectural decisions. We evaluate the **target design** of Agent Teams Orchestrator and Agent Runtime architecture program v3, including the separately scoped greenfield/fleet follow-ups, without penalizing unrealized implementation. We do **not** silently promote open decisions or greenfield proposals into accepted commitments.

Compare problems before copying solutions. The design target is a reliable multi-tenant agent platform for collaboration, one to thousands of concurrently executing agents, managed/self-hosted/Fully Local deployment, provider-neutral harnesses, modular composition, explicit authority, Clean/Hexagonal architecture, SOLID, durable recovery and bounded resource use. Prefer small owner-local improvements over a new universal router, scheduler, shared agent manager, hidden global bus or second module framework.

Canonical local authority (re-check status, supersession and scope before changes):

- [Architecture overview](../architecture/overview.md), [deployment and nine role boundaries](../architecture/deployment-profiles.md), [eventing and reliability](../architecture/eventing-and-reliability.md).
- [ADR-0117: mandatory but bounded Get Modular composition](../decisions/0117-reconcile-mandatory-module-composition.md); [ADR-0114: distributed backend roles](../decisions/0114-canonical-backend-stack-and-distributed-role-adoption.md); [ADR-0115: Fully Local](../decisions/0115-canonical-fully-local-v1-adoption.md).
- [Extension points](../architecture/extension-points.md) and [ADR-0096](../decisions/0096-shared-extension-foundation-and-oci-distribution.md).
- [Open attention/communications design](../open-decisions/OD-026-communication-notification-and-attention.md), [semantic admission](../open-decisions/OD-031-semantic-authority-and-claim-admission.md), [last-mile effects](../open-decisions/OD-032-last-mile-side-effect-safety.md), [context convergence](../open-decisions/OD-033-ooda-convergence-and-context-activation.md), [external integrations](../open-decisions/OD-034-external-integration-management.md), [extension lifecycle](../open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md).
- [Agent Runtime v3 S1–S5](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/agent-runtime-architecture-program-plan.md), [greenfield fleet design](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/agent-runtime-greenfield-foundation-plan.md), [capacity/admission contract](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/capacity-admission-delivery-plan.md).

## Research method and evidence standard

For each observed practice, record: **problem / competing mechanisms / primary-source evidence / benefits / failure modes / fit to our owners / rejected variants / falsifying test / remaining uncertainty**.

Evidence ranks: (A) directly inspected source, tests or normative design record; (B) official documentation with exact reference; (C) authors' claims, examples and reports; (D) inference, hypothesis or illustrative idea. A design may be documented without being implemented; functionality proven for one host/profile is not proof of fleet, security, or cross-platform coverage. An implementation with no demonstrated load or failure testing is not a performance benchmark.

Independent adversarial perspectives to execute after first synthesis: domain/SOLID and dependency direction; distributed durability/retry/fencing; hostile tenancy and prompt-injection/permission leakage; plugin lifecycle and dynamic unloading; concurrency, latency, compute cost, and on-device resource budgets; human-agent UX and context continuity; operational recovery and observable proof. Findings are recorded as reasoned analysis and **must not be represented as external model-run results unless an agent was actually invoked**.

## Comparison questions

1. **Event → intent**: which triggers are authentic; who decides admission, and how is authority attached to an immutable task/mandate?
2. **Routing and context**: how do repeated messages reach an existing execution safely without re-running the LLM for each message?
3. **Concurrency**: can ongoing tool work and new instructions coexist without a concurrent mutation of the same agent state?
4. **Durability**: what happens after ambiguous external effects, restart, duplicate delivery, lease loss, stale completions and source cursor expiry?
5. **Coordination**: where do team/run/work ownership, delegation, follow-ups and human review live?
6. **Modularity and plugins**: which dependencies are static contracts vs dynamic contributions, and who authorizes/lifecycles/unloads them?
7. **Memory and observation**: how are durable evidence, semantic context, model history, lossy live progress and semantic watchdog kept distinct?
8. **Scaling and profiles**: what is bounded per request, tenant, agent, host and worker fleet; how is Fully Local cost controlled?

## Initial falsification rules

- No new authority from chat text, observed events, plugin manifests, model output, cache, lease timeout or broker redelivery.
- Do not call a process alive merely because its heartbeat is healthy; do not let an LLM watchdog become the owner of business transitions.
- Do not call a watch/subscription lossless; do not use latest-state observation to replace durable occurrences or acknowledgements.
- Do not mistake ability to swap a plugin at runtime for isolation or safe rollback.
- Do not infer exactly-once external effects from exactly-once message processing or a transaction over local state.
- Do not infer infinite or thousand-agent capacity from a number of idle sessions, queued jobs, or local worker slots.
- An external project can be excellent in its narrow objective and still be a poor template for our distributed, multi-tenant platform.

## Research artifacts and reading order

1. [Primary-source catalog](agent-harness-source-catalog-2026-11-02.md): 26 relevant projects across always-on gateways, coding harnesses, orchestration SDKs and durable systems, with evidence levels and explicit applicability limits.
2. [Mechanism alternatives and recommended owner fit](agent-harness-mechanism-options-2026-11-02.md): eight independently evaluated problem areas, rejected approaches, source citations, subjective reliability/confidence/complexity scores and bounded LOC ranges.
3. [Pattern and anti-pattern reference](agent-harness-patterns-antipatterns-e2e-2026-11-02.md): 22 useful practices, 24 dangerous patterns and 36 proposed fault-injection and E2E verification cases.
4. [Adversarial review ledger](agent-harness-adversarial-reviews-2026-11-02.md): three structured critique passes from ten distinct technical perspectives, corrections, best counterarguments and unresolved owner decisions.

## Research verdict — proposed, not approved

The strongest case is **not to adopt another harness as a universal Orchestrator foundation**. Keep Agent Teams' bounded contexts, Get Modular static composition, Extension Foundation, native AR custody, context-owned PostgreSQL and JetStream, and selected durable workflow adapters. They solve different responsibilities than a single-repository super-agent.

Prioritize investigating (a) deterministic authenticated source filtering and owner-local correlation, (b) permission-preserving context-only follow-up delivery, (c) capability-qualified in-turn input with durable next-turn fallback, (d) revision/provenance-scoped sparse context and (e) evidence-first bounded progress assessment. Defer generalized speculative execution, ubiquitous LLM routers/watchdogs, unbounded plugin HMR and a universal workflow-engine switch.

**Do not treat the above as an approved behavioral change.** OD-026/031/032/033/034/043 and the relevant Agent Runtime successor remain decision authorities. A separate source comment is not a grant to steer privileged in-flight work; a native transport ACK is not proof that its model read the input; and a workflow checkpoint is not a proof that an external effect did not occur twice.

Research was based on primary-source reading and structured adversarial *analysis lenses*; no separate critic model agents or execution benchmarks were run. Existing accepted ADRs remain untouched. Qualify each subsequent accepted feature on its own real deployment and provider profile.

Update these records when evidence changes; keep the directory [research index](README.md) complete, and do not silently rewrite accepted ADRs.
