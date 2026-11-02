---
id: research.agent-harness-mechanism-options-2026-11-02
type: research
status: active
owner: architecture
summary: Competing designs and recommended owner-local integration seams for always-on agent orchestration, context, full-duplex control, watchdogs, plugins, and durability.
related:
  - research.agent-harness-industry-design-review-2026-11-02
  - research.agent-harness-industry-source-catalog-2026-11-02
---

# Autonomous agent mechanisms: options and proposed fit (2026-11-02)

## Scope and provenance

**Recommendations in this record are research proposals, not approved behavior.** Do not update accepted ADRs, introduce a new bounded context, package, public event, long-lived worker, agent API, automatic action or service without the owning decision and implementation-start gates. Compare target Orchestrator + Agent Runtime v3 as if complete; unresolved OD-026/031/032/033/034/043 and future greenfield/fleet slices remain genuine architectural questions, not deductions from the target design.

Use a **problem → alternatives → failure-mode → owner → candidate → falsifier** decision process. Architectural quality means protecting semantic ownership, observable failure and capacity, not maximizing autonomy or counting plug-in types.

## Findings and design options

### Mechanism decision areas

## M1 — Event intake and new work admission

**Problem.** GitHub/CI/chat events are frequent, duplicated, untrusted and sometimes relevant. Most are context or noise, not fresh permission to act. A bad classifier can start costly and dangerous work.

**Compared approaches:**

1. **Central LLM Router for every event**, as a literalized DeepSeek fast/slow architecture. Good for open-ended intent classification and small prototypes; bad for token costs, p95 tail, semantic ambiguity, cold start and central ownership. A language model can propose but cannot confer authority.
2. **Unconditional source-specific automation**, common in cron/webhook workflows (OpenClaw, n8n). Deterministic and cheap but creates false positives and source-specific policy drift unless admission and source continuity are explicit.
3. **Owner-local deterministic gate + selective advisory classifier** (recommended). Verify source signature/principal/installation and source incarnation; normalize immutable event identity; preserve cursor/receipt; reject disallowed type/scope; correlate to existing Work/Run; ask the model only on a bounded ambiguous candidate. A semantic owner issues a typed admitted intent; no universal `Eval` bounded context.

**Fit and boundary.** External ingestion belongs to a qualified integration adapter (OD-034, deferred); source authenticity and typed claim semantics to OD-031; Work/Run lifecycle to its domain owner; runtime start remains AR-authorized and fenced. Use existing owner transactions/outboxes/JetStream delivery (ADR-0114), not an LLM-driven shared event bus. A subscription to GitHub never gives any mutation grant.

**Do not copy:** DeepSeek's `Engine` as our global state authority; one-repo SQLite `Thread/Ticket` identifiers as universal tenant identities; source text as a command; broad "mentions trigger work" rules; auto-retries after ambiguous effects.

**Falsifiers:** duplicate/out-of-order GitHub deliveries; source loses GitHub permission (404 may hide revoked access); webhook token rotation; project/tenant spoof; group chat prompt-injection; no LLM spending on filtered noise; claim accepted only once with original proof.

References: [DeepSeek domain](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/001-domain.md), [authorization](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/002-authorization.md), [OpenClaw standing intents](https://github.com/openclaw/openclaw/blob/main/docs/concepts/standing-intents.md), [our OD-031](../open-decisions/OD-031-semantic-authority-and-claim-admission.md).

## M2 — Follow-ups, subscriptions and cross-source routing

**Problem.** A late PR review/CI update should reach the relevant existing Work without re-running triage, losing operator context or granting the sender execution powers.

**Compared approaches:**

1. **Always re-evaluate with central agent.** Simple conceptual UX, but duplicates work and drives unbounded token/latency bills.
2. **Route by mutable thread title or session ID.** Cheap but unsafe under forks, identity collisions, credential changes and source reinstallation.
3. **Persisted source correlation and typed delivery intent** (recommended): `(sourceInstance, eventOccurrence, canonicalProject, ownerWork/Run, relationGeneration)`. New source facts may enter an existing work context without starting a new mutation. An incoming *instruction* must pass current auth/delegation and the original Work/Run policy; a third-party comment is context by default. Delivery outcome (stored, queued, seen, applied, refused, missed) must be distinct and recoverable.

**Fit.** Work Coordination owns work relationships; Agent Communication owns authored conversation and recipient delivery; Agent Attention owns wake intent; Agent Context assembles permitted source revisions; Run Orchestration owns activation; AR owns technical session input/receipt. Do **not** clone one generic `Ticket` repository into every context. Prefer direct owner port for one receiver, own outbox/JetStream for durable asynchronous fan-out, no lossless assumptions about Get Modular Observation.

**Falsifiers:** comment after a PR moved to a new Work; one event relates to two Runs; disabled connector with old cursor; partial fan-out; deleted thread; malicious new participant in a shared thread; no double wake or double tool effect.

References: [DeepSeek intake/routing](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/007-architecture.md), [OpenClaw per-agent routing](https://github.com/openclaw/openclaw/blob/main/docs/concepts/multi-agent.md), [our OD-026](../open-decisions/OD-026-communication-notification-and-attention.md), [OD-033](../open-decisions/OD-033-ooda-convergence-and-context-activation.md).

## M3 — Full-duplex input while a harness is working

**Problem.** A process running a tool must continue receiving human guidance, CI results and cancellation without corrupting transcript, violating sandbox policy or repeating unknown effects.

**Compared approaches:**

1. **Abort and restart every time.** Superficially responsive; breaks in-flight effects, custody, terminal accounting and session continuity. Reject.
2. **Universal synthetic in-turn injection to all providers.** Attractive interface, but false capability claims; prompt history may be serialized, provider processes may not support steering. Reject.
3. **Always queue new turn after current completion.** Safe baseline but frustrating on long operations; retain as fallback, not only implementation.
4. **Capability-negotiated safe-point steering** (preferred conditional path): new input persisted by its owner, separately authorized, and delivered into a *specific* active runtime execution only when its native adapter advertises an exact input lifecycle and acknowledges acceptance. Tool already running is not forcibly changed. Else use durable next-turn queue. `stop/cancel` is a different authorized command.

**Authority rule:** Same authenticated requester + compatible immutable execution policy may guide the in-flight turn; another principal cannot silently steer under original principal's grants. An explicit, product-owned, narrowly delegated collaboration policy may authorize a specific future case, but a shared channel alone never does. Never combine two principals' permissions via a synthetic "chat session user". Revalidate current revocation and Run generation before protected effects even if the original execution policy was captured at start.

**Operation statuses:** distinguish `saved`, `queued`, `native_accepted`, `consumed`, `applied_to_decision`, `terminal`, `unknown`. No translation of `write accepted` into `model consumed`. A lost native ACK keeps uncertainty; it is not safe to submit a second copy automatically.

**Fit.** Adapter capability under AR Agent Execution's harness/session contract (outside S1–S5 bounded ordinary rewrite, except ADR-0091's explicitly admitted interactive slice); Orchestrator retains product message, Work/Run and auth ownership. Public API must not expose native provider IDs as business principals.

**Falsifiers:** tool already executing; turn ends before steer is read; crossed session generation; a canceled input with delayed ACK; incompatible provider; two actors same thread; two concurrent steers; approval pending; provider reconnect; old permission after revocation. Native Codex `turn/steer` is evidence of one possible real adapter, not all providers.

References: [Codex app-server protocol](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md), [OpenClaw steering exact boundaries](https://github.com/openclaw/openclaw/blob/main/docs/concepts/queue-steering.md), [our runtime v3 scope](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/agent-runtime-architecture-program-plan.md).

## M4 — Agent Context and memory under a bounded budget

**Problem.** Chat transcripts, project docs, GitHub threads, tool outputs and long-horizon memory are too large, differently trusted and not all current. Full-context injection is expensive and prompt-injection prone.

**Compared approaches:**

1. **Append everything to agent session history.** Easy initially; token cost and stale/unauthorized information compound.
2. **Model-managed arbitrary "Chain of Recall" with full access.** Adaptive, but retrieval cost is unbounded and the model can choose to ignore important constraints.
3. **Source-provenance ContextPlan/Manifest with typed sparse retrieval** (preferred): the semantic Agent Context owner selects current source IDs/revisions, provenance, freshness, permission scope and budget. AR owns compilation into provider-specific material and session/tool-history consumption. A small trusted summary plus handles to authorized details can be fetched on demand; deliberate source-policy and bounded retrieval own fallback and truncation.

**Trust rules:** A model summary is derived data, not an owner command or independent fact. Instruction, task evidence, conversation, episodic memory, curated memory and raw tool output keep different trust levels. Untrusted content cannot promote itself into persistent instruction, newer grant, permission or project policy. Source deletion/revocation invalidates future materialization without claiming erasure of already executed effects. Do not build another memory database just to implement reference handles.

**Fit.** Current Agent Context boundary (ADR-0073 / OD-028) plus OD-033; AR only technical materialization. Query and budget ports depend on real consumers. Explore OpenClaw's provenance/promotions and Deep Agents filesystem offload but do not import their specific layout.

**Falsifiers:** poisoned README proposes policy change; source revision changes during assembly; revoked collaborator; multiple contexts with mismatched disclosure; context truncated before approval policy; retrieval loop exceeds budget; identical text from different source occurrences.

References: [OpenClaw memory architecture](https://github.com/openclaw/openclaw/blob/main/docs/concepts/memory-architecture.md), [Deep Agents](https://github.com/langchain-ai/deepagents/blob/main/README.md), [our OD-028](../open-decisions/OD-028-agent-context-lifecycle.md).

## M5 — Semantic watchdog and progress assessment

**Problem.** A healthy process can loop on useless work. A stalled LLM may continue spending tokens indefinitely, while a long silent tool may still make valid progress.

**Compared approaches:**

1. **One monitoring LLM continuously judging every agent.** High cost, false positives, new global decision authority and a scaling hotspot. Reject.
2. **Only OS heartbeat and timeouts.** Cheap and reliable for liveness but blind to objective progress. Insufficient alone.
3. **Two-tier evidence-first supervision** (preferred): operation/receipt/tool deadline, resource budgets, last *verified domain progress*, stable checkpoints and explicit blocked/uncertain status form deterministic triage. Optionally ask a bounded semantic assessor for evidence-backed advice only after a suspicion threshold and budget permits; do not let it perform product transitions or retry effectful work.

**Ownership.** Product goal/progress acceptance: Run Orchestration / Work Coordination. Native process liveness and effect custody: AR. Technical health from OTel, logs or Get Modular Observation is advisory and rebuildable. A watchdog creates `progress_suspected_stale` evidence or a request for an authorized owner decision, not new execution authority.

**Falsifiers:** a ten-minute valid compile is not a stuck process; output spam is not progress; an agent repeatedly rewrites same file; partial model outage; watchdog itself restarts; stuck cleanup debt; operator silence during no-network Fully Local.

References: [DeepSeek Super-agent article](https://x.com/deepseekharness/status/2116857257245987236), [our reliability objectives](../architecture/reliability-objectives.md), [runtime admission](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/capacity-admission-delivery-plan.md).

## M6 — Plugins and runtime replacement

**Problem.** Let providers, tools and extensions evolve without domain coupling, module-discovery races, stale authority or unsafe unloads.

**Compared approaches:**

1. **Cordis-style everything-is-a-plugin for all business code.** Broad dynamic replacement but hidden ambient context and lifecycle coupling threaten DDD boundaries. Good as a harness implementation strategy; reject as Orchestrator-wide architecture.
2. **Static typed capabilities only.** Best for explicit deterministic business graph; alone cannot perform hot install, permission-scoped dynamic loading or cross-process untrusted plugin isolation.
3. **Get Modular composition + separate Extension Foundation (already selected), with product-owned dynamic Host adapter when a real case demands it.** Keep Core/Assembly static, authorizing Host explicit, narrow consumer ports, type/contract conformance, artifact identity distinct from active generation. Add dynamic lifecycle only after OD-043 determines revocation, inflight drain, rollback, isolation and recovery with measurable consumers.

**Fit.** Retain ADR-0117 and ADR-0096; no new `PluginManager` service locator, second DI graph or always-on HMR in production Core. Built-in trusted TS modules may use direct typed ports; untrusted code needs process/worker/remote isolation with validated DTOs and effect limits. Signed OCI digest is a supply-chain property, **not** a sandbox or runtime authorization.

**Falsifiers:** unload while awaited capability still runs; two versions both mutate one context; plugin depends on incompatible runtime singleton (OpenCode Effect V2); pending effect accepted before disable; signature valid but malicious; source revocation; lost rollback cleanup.

References: [DeepSeek Harness Cordis](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md), [OpenCode plugin peer runtime](https://github.com/anomalyco/opencode/blob/dev/packages/plugin/README.md), [our extension points](../architecture/extension-points.md), [OD-043](../open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md).

## M7 — Durable workflows, replay and execution fencing

**Problem.** Resume weeks-long Run orchestration and approved human waits while avoiding duplicate external actions. Checkpoint, message ACK, process lease and a third-party effect receipt are different proofs.

**Compared approaches:**

1. **New universal custom workflow engine** beside Temporal, JetStream and PostgreSQL. Large semantic and operating cost, duplicates owners, risk of unsafe effects on replay. Reject.
2. **Put every agent state transition in Temporal/Restate/LangGraph.** Simplifies some adapters but couples product authority and low-level AR process custody to a framework and may accidentally duplicate state/journals. Reject as global mandate.
3. **Existing context-owned durable commands, receipts, outbox/inbox and fences; selected Temporal adapter only for a Run workflow that genuinely requires it** (preferred under current ADR-0027). A fully local engine is governed separately by OD-035, not chosen silently by this review. LangGraph checkpointing remains useful at an optional LLM graph edge, not a substitute for canonical business state. The same semantic command identity and failure policy must be proved for every adapter.

**Critical nuance:** Temporal Activities and Restate journaled side effects can be retried after an external success whose durable completion ACK was lost; LangGraph replay also re-executes incomplete tasks. **No engine removes the need for external idempotency or explicit uncertain-effect reconciliation.** A workflow's durable "step done" is not a proof that all physical processes were stopped.

**Falsifiers:** worker killed after external merge but before recording result; expired Run/lease with stale wake; workflow paused for a week with approval revoked; recovery from backup older than external effect; replay after schema change; browser/desktop local offline; no per-agent broker connection.

References: [Temporal workflow replay](https://docs.temporal.io/workflows), [Temporal activity idempotence](https://github.com/temporalio/documentation/blob/main/docs/encyclopedia/activities/activity-definition.mdx), [Restate caveat](https://restate.dev/blog/why-we-built-restate), [LangGraph checkpoint modes](https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/checkpointers.mdx), [our eventing](../architecture/eventing-and-reliability.md).

## M8 — Speculation, prefetch and eager parallelism

**Problem.** Reduce wait on slow analysis without performing risky effects before an instruction is admitted.

**Compared approaches:** no speculation (simple, safe); speculative **read-only** fetch/precompute after source authenticity and with tenant/resource budget (potentially useful); speculative tool/file/network mutations based on model-inferred future intent (reject).

**Research outcome:** defer general speculation. A later concrete consumer may use capped, revocable read-only prefetch tagged with source revision and expiry; never dispatch execution, spend quota without admission, use a future approval, warm secret-bearing environment, or mutate external state. Avoid a dedicated speculation service or universal predictor before measurement.

## Comparative engineering estimates — proposals, not promises

Expected reliability (R), evidence confidence (E) and engineering/operational complexity (C) are **subjective 1–10 judgments**, not benchmarks; higher R/E is better and higher C is costlier. Estimates cover **new handwritten owner-local TypeScript integration** plus focused contract/E2E tests in the named scope; they exclude external connectors not approved, upstream framework implementation, generated schemas, deployment packages and migration of already accepted models. Approximate range uncertainty: ±50–100% pending a real approved vertical slice.

| Candidate | R/E/C | Integration + tests (handwritten LOC) | Assessment |
| --- | --- | --- | --- |
| Global model Router + universal `Ticket` aggregate | 4 / 6 / 9 | 3,000–7,000 + 2,000–5,000 | Rejected: duplicates domain owners, latent escalation |
| Owner-local intake/correlation + selective advisory LLM | 8 / 7 / 5 | 500–1,400 + 500–1,200 | Recommended for an approved ingress/attention slice |
| Universal provider steering shim | 3 / 8 / 7 | 1,000–2,500 + 1,000–2,000 | Rejected: fake semantics and duplicate input |
| Native-capability steering + durable next-turn fallback | 8 / 7 / 6 | 600–1,600 + 700–1,600 | Conditional per-qualified harness; separate AR successor |
| Continuous LLM watchdog of every agent | 3 / 7 / 8 | 1,500–3,000 + 800–1,500 | Rejected: cost and false authority |
| Evidence-first owner-local progress check + advisory review | 8 / 6 / 4 | 300–900 + 400–1,000 | Conditional; requires an actual progress consumer and workload |
| All-Cordis dynamic business core | 3 / 7 / 9 | 4,000–10,000 + 2,000–5,000 | Rejected: undermines accepted composition/DDD boundaries |
| Existing Get Modular + later scoped extension runtime | 8 / 8 / 4 now | 0 new Core LOC now; OD-043 lifecycle later | Preserve current approved foundation |
| Replace business durability with universal new workflow | 4 / 7 / 10 | 5,000–12,000 + 3,000–6,000 | Rejected: duplicate authority and replay risk |
| Preserve owned state; add selected workflow adapter | 9 / 8 / 5 | 400–1,200 + 500–1,200 | Match current ADR-0027, with strict effect oracles |
| Read-only revision-bound prefetch | 6 / 5 / 4 | 200–700 + 300–600 | Optional after real measurements; not baseline |

No table row authorizes immediate implementation. Product owner chooses any behavioral change through its open-decision/ADR flow.

## Decision status and qualification

### Minimum-scope selection

Recommend **retaining the existing architecture** and refining contracts where there is a real seam: (1) owner-local source correlation and advisory assessment, (2) proven native steering or safe durable fallback, (3) source- and authority-aware context manifests, (4) evidence-first progress review, (5) extension generation/custody in OD-043, and (6) current owner-local durability. Explicitly reject generic Router/AgentManager, Cordis-for-everything, speculative writes, always-on evaluator LLMs, universal engine migration and a second scheduler.

The concrete architecture change, if approved, should be **new rejecting conformance scenarios and precise owner contracts first**, not a new framework or broad runtime code sweep. Cross-link to the [review ledger](agent-harness-adversarial-reviews-2026-11-02.md) for objections and unresolved choices.

## Evidence and sources

Each M1–M8 mechanism section links the first-party evidence used in that comparison. The [source inventory](agent-harness-source-catalog-2026-11-02.md) separates official architecture, documented prototypes, readme claims and engineering hypotheses. The [adversarial review ledger](agent-harness-adversarial-reviews-2026-11-02.md) records counterarguments and [pattern/E2E reference](agent-harness-patterns-antipatterns-e2e-2026-11-02.md) records falsifiers.

## Limitations and remaining questions

Estimates are deliberately non-committal and require a scoped accepted implementation plan. In particular, multi-principal steering, external connector installation, source authorization, context activation, watchdog thresholds, dynamic plugin generations, hosted/fleet capacity and local durable workflows still require exact owner decisions and real negative-test evidence.
