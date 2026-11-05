---
id: research.agent-harness-technical-case-studies-2026-11-02
type: research
status: active
owner: architecture
summary: First-party mechanism case studies on steering, authorization, checkpoint guarantees, worker placement, memory provenance, and plugin ABI.
related:
  - research.agent-harness-industry-design-review-2026-11-02
  - research.agent-harness-industry-source-catalog-2026-11-02
  - research.agent-harness-mechanism-options-2026-11-02
  - research.agent-harness-adversarial-reviews-2026-11-02
---

# Agent harness technical case studies (2026-11-02)

## Scope and provenance

Focused source and first-party documentation examination on 2026-11-02, beyond high-level project READMEs. Compare **failure guarantees** rather than marketing, framework popularity or amount of code. Selected OpenClaw, Codex, DeepSeek, LangGraph, Temporal, OpenHands, OpenCode, Hermes and Deep Agents docs are noted below. These are source/documentation reads, **not** executable reproduction or independent vendor security certification. Moving branch links need a fresh pin at implementation time. Orchestrator and Agent Runtime v3 are compared at target design, without penalizing documentation-only parts.

## Findings and design options

### C01 — OpenClaw steering safe points, not magic preemption

**Problem:** deliver new instructions during a running model/tool cycle, while maintaining consistent ordered transcript and not duplicating tool effects.

**Actual documented mechanism:** [OpenClaw queue steering](https://github.com/openclaw/openclaw/blob/main/docs/concepts/queue-steering.md) distinguishes default steer and followup/collect, explicit `/steer`, queue fallback, checked boundaries around launching sequential tools, non-interruption of already-running commands, and synthetic results for skipped *unstarted* tool calls. Parallel tool batches launch together without mid-batch steering cancellation. Native Codex uses `turn/steer` whereas CLI plugins need a real injection sink; these paths are not semantically equivalent.

**Good:** precise safe points, honest observable result of skipped calls, order retention, fallback instead of claiming support. **Bad or unsafe for us:** default collaborative steering lets another person influence an authorized run; the [OpenClaw security guide](https://github.com/openclaw/openclaw/blob/main/docs/gateway/security/index.md) explicitly assumes one trust boundary per gateway, not hostile-user multi-tenancy. A shared chat is a poor permission principal. Every delivered input also consumes model turns and context budget.

**Recommended:** integrate exact harness-supported steering at AR capability boundaries, with original Run generation, current principal, revision and audit. Work comments enter context, not actor A's instruction authority. No universal synthetic steering. **Counterexample:** B asks agent A (already running privileged deployment) to run a new shell command; B's text must not silently inherit A's grants.

### C02 — Codex App Server expected-turn fencing and partial receipts

**Problem:** safely steer an active coding turn through stable client protocol, rather than killing and restarting processes.

**Actual documented mechanism:** [official Codex App Server](https://learn.chatgpt.com/docs/app-server) names `Thread`, `Turn`, `Item`, initialization handshake, `thread/resume`, `turn/start`, `turn/steer` and `turn/interrupt`. `turn/steer` requires `expectedTurnId` matching the active turn and rejects when none exists; it appends input without new `turn/started`, and **cannot** override current turn's model, cwd, sandbox policy or output schema. Methods are recorded in [protocol source](https://github.com/openai/codex/blob/main/codex-rs/app-server-protocol/src/protocol/common.rs) and [TurnSteer params](https://github.com/openai/codex/blob/main/codex-rs/app-server-protocol/src/protocol/v2/turn.rs). Schemas generated from the installed binary are version-specific.

**Good:** precise session generation precondition, explicit lifecycle and bounded control transport. **Limits:** protocol accepted/queued input is not proof a model consumed it; client lifecycle events, approval requests and canceled turns can race with delayed ACK. Experimental WebSocket and process APIs have different deployment support and permission guarantees.

**Recommended:** AR's provider adapter should expose *real, qualified target* capabilities and track request/ACK/consume separately. Never assume every harness accepts native steer; never permit `turn/steer` as a substitute for authorization or `turn/interrupt` as proof native cleanup completed.

### C03 — DeepSeek's small Engine is well-designed locally, not a universal distributed owner

**Problem:** keep one always-on agent coordinated across event sources without LLM calls for every follow-up.

**Actual mechanism:** [DeepSeek domain model](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/001-domain.md) and [architecture source index](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/007-architecture.md) show typed Source, Trigger, Thread, Eval, Mandate, Ticket and Assignment; a single `Engine` writes business state in local atomic SQLite transactions while enqueueing external effects for post-commit work. It has distinct Source, human, worker and main-Session API surfaces, retry/receipt handling and [restart reconciliation](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md).

**Good:** one writer per local aggregate, explicit authority/admission and context-only subscriptions, deterministic duplicate handling, practical restart failure discipline. **Critical failure on transplantation:** one local Engine's transaction cannot atomically govern Orchestrator's distinct Work, Run, Communication, Agent Context, approvals and AR physical custody. The prototype's Executor runs without approval as the operator's OS user. It is not a hostile multi-tenant sandbox. Its event/LLM routing is one implementation choice, not a distributed orchestration law.

**Recommended:** copy its separation of *source observation*, *decision candidate*, *authorized intent* and *durable delivery*, not the global `Ticket` aggregate or single writer across bounded contexts. Test cross-context fan-out and lost external effect receipts independently.

### C04 — LangGraph `sync` durability is not a cross-language contract

**Problem:** retain exact, recoverable steps across crashes without excessive checkpoint overhead.

**Source-backed surprise:** LangGraph official [checkpointing documentation](https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/checkpointers.mdx#durability-modes) describes `exit`, `async`, and `sync`. For **Python**, `sync` commits each checkpoint before the next user node progresses. For **JavaScript**, the same documentation says the runtime may proceed before pending checkpoint writes settle and awaits them at run completion; a crash mid-run can lose recent checkpoints even in `sync`. The TypeScript consumer **must not** infer Python's admission durability from the mode name. A [public Python API reference](https://reference.langchain.com/python/langgraph/types/Durability) confirms the Python meaning.

**Good:** clearly exposed performance/durability trade-off; checkpointer and HITL are useful at the graph edge. **Limit:** a graph checkpoint is not an AR dispatch grant or exactly-once external effect. An interrupted node can be rerun; unlike an owner outbox record it may not prove whether external API side effects occurred.

**Recommended:** keep context-owned PostgreSQL transaction/receipt as durable acceptance authority. A selected LangGraph adapter may persist *advisory graph progress* under an explicitly qualified language and mode. **Rejecting E2E:** delayed checkpointer write, crash after node external side effect but before checkpoint, then restart: no repeated irreversible effect under a new identity.

### C05 — Temporal's worker versioning, event history size and host affinity

**Problem:** reliable execution/upgrade of long-lived workflows at scale.

**Source-backed mechanisms:** [Temporal Worker deployment best practices](https://docs.temporal.io/best-practices/worker) recommend at least two workers per production queue **per active worker deployment version**, but explicitly exclude host-affine queues whose local files/state would not exist on another host. Pinned versions must retain matching workers. Temporal warns that very large Event Histories slow replay, recommends `Continue-As-New`, and specifies limits including **51,200 events**, **2 MB individual payload** and **50 MB total history** in the cited documentation. It recommends a Claim Check (store bulky data externally, put references in history). [Temporal Tasks](https://docs.temporal.io/tasks) distinguishes replayed Workflow code from retryable Activity attempts; [Retry Policy](https://docs.temporal.io/encyclopedia/retry-policies) notes Activity retry defaults and idempotency responsibility.

**Good:** robust battle-tested workflows, explicit versioned execution, durable timers and human waits, tested failover operations. **Bad or expensive for us:** blindly assigning generic workers to AR's resource-affine operations violates native custody; retaining old worker versions indefinitely has operational cost; a giant prompt/history in workflow events increases storage and replay overhead; Workflow-level exactly-once does not imply external Activity effect exactly-once.

**Recommended:** maintain selected Temporal adapter for appropriate product Run orchestration (ADR-0027), with immutable workflow semantic input IDs, external reference payloads, bounded history, compat/versioning and no direct AR host process ownership. Fully Local workflow selection stays OD-035, not silently Temporal-backed.

### C06 — OpenHands SDK's four-package separation

**Problem:** separate agent-loop concerns, tools, execution environment and HTTP server for both embedded and remotely hosted agents.

**Actual source:** [OpenHands official SDK architecture](https://github.com/OpenHands/docs/blob/main/sdk/arch/overview.mdx) documents core `openhands.sdk` (agent, conversation, workspace abstraction), optional `openhands.tools`, optional `openhands.workspace` (Docker/remote) and optional `openhands.agent_server` (remote API). It distinguishes a lightweight local in-process mode from hosted workspace/Agent Server mode; frontend is not the owner of sandbox execution.

**Good:** reusable library-first slices, clients do not implement process execution, physical deployment modes through adapters. **Limitation:** a library separation does not by itself prove multi-tenant credentials isolation, remote effect exactly-once, free transfer of an open process or our fully local native PostgreSQL/JetStream reliability constraints.

**Recommended:** maintain AR's already planned independent libraries, separately owned native custody, curated public Host API and product-only Orchestrator. Adopt neither OpenHands package naming nor a new universal HTTP-to-agent kernel.

### C07 — OpenCode V2 plugins and runtime singleton ABI

**Problem:** host plugins and share one async runtime with loaded extensions rather than bundling incompatible duplicate infrastructure.

**Actual source:** [OpenCode V2 plugin README](https://github.com/anomalyco/opencode/blob/dev/packages/plugin/README.md) explicitly requires a host-provided `effect` instance with `effect` peer dependency, forbids bundling own `effect`, and notes that other `effect` major versions are incompatible. Exposing a plugin entrypoint does not make all versions ABI compatible.

**Good:** this is a concrete negative fixture for loader qualification and dependency-singleton semantics. **Limit:** forcing all extensions into the same in-process Effect runtime is not sufficient for untrusted third-party isolation. Passing JS objects by reference into plugins can bypass product-owned capability boundaries.

**Recommended:** Extension Foundation should preserve exact provider/runtime ABI and manifest permissions separate from installation consent and enforced grants. Trusted in-process plugins get only narrow typed facades; untrusted code crosses isolation/IPC. Activation/upgrade/deactivation stays governed by OD-043.

### C08 — OpenClaw's memory provenance as a safer model than free-form recall

**Problem:** a long-lived agent may encounter malicious third-party text and later remember it as a user instruction.

**Actual source:** [OpenClaw memory architecture](https://github.com/openclaw/openclaw/blob/main/docs/concepts/memory-architecture.md) distinguishes owner, agent-derived and untrusted provenance, write-time gates, curated/core vs episodic memory, and sessions not eligible for promotion. This addresses prompt injection *promotion*, not merely prompt injection *reading*. It also explicitly notes that ordinary workspace files are trusted inside an operator trust boundary.

**Good:** track promotion provenance structurally before data enters long-term memory, not only by scanning content after retrieval. **Bad for our hostile tenancy:** a shared workspace is not automatically a trusted source; a tenant colleague or compromised plugin may write it. Trust must come from authenticated canonical source classification, not file location.

**Recommended:** Agent Context carries typed source provenance, revisions and disclosure; summaries remain derived. No direct text-to-policy promotion or cross-tenant retrieval. No new memory engine is required just to adopt provenance metadata.

### C09 — Hermes Agent's long-lived permissive mode and storage failure lesson

**Problem:** retain autonomous sessions and user preferences across restarts, safely sharing local files between gateway/desktop/cron.

**Source:** [Hermes security](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/security.md) says its `YOLO` session mode persists after a restart, while a hardline blocklist still applies; unattended mode can deny approval-requiring commands. [Hermes session recovery](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/session-storage-recovery.md) describes SQLite WAL recovery and refusal of concurrent maintenance with active writers.

**Good:** explicit unattended approval semantics and operator recovery runbooks. **Bad for our product:** permanent bypass of user-facing permission prompts is not a tenant grant or proof of allowed backend operations; local SQLite WAL lifecycle is not a distributed durability solution.

**Recommended:** preserve separate product authorization, per-operation technical grant, captured approval basis, and current last-mile revocation. Use safe offline recovery runbook patterns without adopting database fallback or global `YOLO` authority.

## Decision status and qualification

**Preferred bounded direction:** retain Orchestrator's accepted bounded contexts, Dapr/JetStream/PostgreSQL service semantics, Get Modular static composition, Extension Foundation, and AR native custody. Add real owner-scoped source correlation and contextual follow-ups where accepted; only support per-target-native input steering; use provenance-aware manifests; optionally evaluate semantic progress. These cases strengthen *reasons* for those choices, not permission to implement them automatically.

**Specific rejected transplants:** Super-agent `Engine` as a global domain owner, OpenClaw cross-principal steering as permission sharing, LangGraph `sync` as accepted-step durability for TypeScript, Temporal Activity retries as exactly-once external effects, Cordis as a replacement for every domain dependency, signed plugin artifact as a sandbox.

Current owner-open decisions: [OD-026](../open-decisions/OD-026-communication-notification-and-attention.md), [OD-031](../open-decisions/OD-031-semantic-authority-and-claim-admission.md), [OD-032](../open-decisions/OD-032-last-mile-side-effect-safety.md), [OD-033](../open-decisions/OD-033-ooda-convergence-and-context-activation.md), [OD-034](../open-decisions/OD-034-external-integration-management.md), [OD-043](../open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md). No accepted ADR changed.

## Evidence and sources

Each case links first-party code, official documentation or repo architecture. [Source catalog](agent-harness-source-catalog-2026-11-02.md) includes remaining 26 OSS comparators and evidence grades. [Mechanism options](agent-harness-mechanism-options-2026-11-02.md) compares competing mechanisms, [reusable patterns and proposed E2E tests](agent-harness-patterns-antipatterns-e2e-2026-11-02.md) translate the scenarios into falsifiable behavior, [adversarial reviews](agent-harness-adversarial-reviews-2026-11-02.md) preserve counterarguments.

## Limitations and remaining questions

No competitive binary/source tests or benchmarks were executed in this report. Markdown links to external provider documentation can change. Specific runtime/profile versions, workload shapes, external idempotency APIs, security deployment boundaries and local resource budgets must be tested before a release or architectural substitution is approved. No benchmark of our target design's actual scaling or latency is claimed.
