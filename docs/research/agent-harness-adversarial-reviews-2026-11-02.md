---
id: research.agent-harness-adversarial-reviews-2026-11-02
type: research
status: active
owner: architecture
summary: Multi-pass adversarial objections, revisions, unresolved risks and bounded recommendations from agent harness industry research.
related:
  - research.agent-harness-industry-design-review-2026-11-02
  - research.agent-harness-industry-source-catalog-2026-11-02
  - research.agent-harness-mechanism-options-2026-11-02
  - research.agent-harness-patterns-antipatterns-e2e-2026-11-02
---

# Adversarial architecture reviews (2026-11-02)

## Scope and provenance

The critique below uses **three separately structured adversarial review passes** over the source catalog and proposed alternatives, from 10 named reviewer perspectives. They are distinct *analysis lenses*, **not claims that separate LLM agents, independent external humans, or high-effort model jobs ran**. No subagent orchestration or model/effort switch was available during this research. All objections and dispositions are authored analysis; inspect cited sources and current accepted ADRs before treating them as evidence. Claims from an external project's README remain claims, not measured production behavior.

Each objection must state a possible counterexample, affected owner and the smallest correction. High-severity unresolved issues stay explicitly open. Score reliability/confidence/complexity and code estimates in [mechanism options](agent-harness-mechanism-options-2026-11-02.md) are engineering judgments, not results from trials.

## Findings and design options

### First-round objection inventory

## Round 1: independent mechanism critics

| Lens | Strong objection to initial attractive idea | Disposition and concrete refinement |
| --- | --- | --- |
| **DDD / Clean Architecture** | Copying DeepSeek `Trigger → Eval → Ticket → Assignment` whole creates a second owner for tasks, approvals, attention and execution. The apparently neat `Ticket` aggregate becomes a god-context for 18 strategic bounded contexts. | **Accepted.** Preserve Work Coordination, Run Orchestration, Agent Communication, Agent Attention and Agent Context as distinct owners. Reuse only narrow *semantics* (source receipt, admitted claim, context correlation); no generic platform `Ticket`. |
| **Distributed systems** | "Persist before dispatch" is insufficient when an external tool committed and its ACK was lost; replay, Temporal history and JetStream duplicate protection do not undo outside writes. | **Accepted.** Every effect has one owner, original stable identity, explicit unknown disposition, readback or manual reconciliation and last-mile fence. No blind retry. |
| **Security / hostile tenancy** | OpenClaw's convenient shared conversation steering may let actor B influence actor A's privileged turn; its own security docs say the Gateway is one trust boundary. Our product allows mutually distrusting organizations. | **Accepted / P0.** Same authenticated original principal only by default; others are context or new separately admitted work. Explicit delegated collaboration is an open OD-026/031/032 decision, not a default inheritance of actor A's tools. |
| **Agent Runtime / adapters** | "Full duplex" is not one provider-neutral capability: native Codex `turn/steer`, OpenClaw embedded steering and generic ACP/CLI have different safe points and ACK meaning. | **Accepted / P0.** Runtime-owned per-profile capability negotiation, native exact-turn binding, no fictitious steering; next-turn queue fallback. Keep this outside the ordinary v3 S1–S5 unless an accepted successor admits it. |
| **Context / information security** | "Chain of Recall" can retrieve poisoned text; trusting a model summary as an instruction allows durable prompt injection. OpenClaw's workspace-memory trust assumption differs from hostile tenancy. | **Accepted / P0.** ContextPlan stores revision/scope/provenance; retrieval is authorized and budgeted. Model-generated summary remains derived data, cannot elevate source authority. |
| **Plugin/lifecycle** | Cordis can dynamically unload registrations, but adoption of its ambient context everywhere would reopen our Get Modular selection and inject framework objects into business code. Conversely static Get Modular cannot itself hot-load plugins. | **Accepted.** Keep composition immutable per Host; dynamic extension activation later through separately selected product Host boundary and Extension Foundation, OD-043. No invented static hot reload. |
| **Operations / cost** | LLM evaluation per notification and LLM watchdog per running agent scale poorly with 1k+ execution fleet. Health checks are not goal checks and goal checks can hallucinate. | **Accepted.** Deterministic filters and owner progress facts first; semantic assessment only when bounded and advisory, with per-tenant budgets. |
| **Fully Local** | Introducing always-on router, vector DB and semantic watchdog service makes offline desktop expensive and contradicts no-overengineering. | **Accepted.** No mandatory new process, storage engine or model call on startup. Use already qualified coarse roles / Host and optional conditional analyzer. |
| **Human collaboration** | Default same-principal-only steering may block a legitimate teammate correcting a flawed approach to shared Work. | **Partially accepted.** Persist teammate message as authored Work context; separate typed collaboration/delegation decision may permit instruction at current owner scope. Do not blur users by using a shared session identity. OD-048 remains relevant. |
| **Evidence quality** | Prior comparison judged our design more scalable without an actual matched benchmark; DeepSeek sample is one repo, but our target is a larger theoretical stack. | **Accepted.** Compare architecture objectives at design level equally; never assert measured fleet advantage or infer implementation correctness. Define falsifying E2E and latency/cost metrics rather than winner scores. |

### Round 1 correction to initial recommendation

Original tempting proposal: "adopt DeepSeek Router, pass-through, memory recall and watchdog." **Revised:** adopt *problems and invariants*, not its subsystem shape. No central LLM router. Only approval-scoped external source→owner admission, relation-bound follow-up, native-supported steering, permitted context retrieval and evidence-first advisory monitoring. Do not introduce universal `Mandate`, `Ticket`, `Router` or `Watchdog` as shared domain primitives.

## Round 2: counterfactual failures and ownership critics

| Scenario / second-pass challenge | Why popular approaches can fail | Required boundary correction or remaining decision |
| --- | --- | --- |
| 1. A run accepted a secret-bearing deployment; its owner loses rights while a tool is pending. | In-turn permissions captured at start can outlive revocation; a new message cannot make them safer. | Recheck relevant current last-mile authority/Run generation before protected effect. Runtime cancellation and cutoff remain independently enforceable. OD-032 open. |
| 2. Different actor comments on same GitHub PR after a merge. | Source-to-thread correlation can attach a new command to a finished task or a retired generation. | Explicit relation generation and closed Work/Run disposition; typed new intent if work must resume. OD-026/033. |
| 3. One occurrence matches several subscribed jobs. | Single global `Ticket` and one ACK can suppress required independent recipient deliveries, or fan out twice. | One source receipt and per-owner delivery intents/outcomes; avoid cross-context transaction and cross-context shared inbox. |
| 4. Source returns 404 after permission loss. | "Not found" can mean deleted or inaccessible; auto-dropping/retrying changes audit evidence. | Distinguish authenticated source continuity, unknown authorization and explicit retention policy; no new rights. [DeepSeek retry guidance](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md). |
| 5. LLM classified "please merge" from quoted malicious tool output. | Content changes meaning without trusted source context. | Canonical typed principal, source occurrence and direct user intent; reject as instruction. |
| 6. Native `turn/steer` returns success, but the model never used it before completion. | Transport ACK may prove only accepted memory/queue, not decision effect. | Separate native accepted/consumed/output statuses; no fabricated "applied" success. |
| 7. Assistant calls a tool; user interrupts mid-call; remote effect already happened. | Stop is cooperative and no API can undo remote mutation. | Record cancellation separately from external settlement; reconcile by original effect ID, no auto replay. |
| 8. Agent reports "ready" while its process retains background child operations. | Text completion doesn't prove physical quiescence or cleanup. | Runtime owns native custody, process effects and debt; semantic owner owns Work completion. |
| 9. Semantic watchdog loops with a stalled agent over the same stale log. | Both LLMs share false assumptions and cost, producing self-amplifying "repair". | Advisor only; require new independently verifiable evidence before another review/attempt; bounded attempts, operator escalation. |
| 10. Plugin signed but altered third-party dependencies run in same Node process. | Signature and install provenance are not process isolation. | Trusted in-process modules only under agreed risk; untrusted code crosses sandbox/DTO/IPC. No direct private table/secret access. |
| 11. Plugin unload arrives during an async resource acquisition. | Cleanup called before awaited acquisition resolves leaks an acquired handle; "closed" state can be false. | Pre-reserve attempt and generation; Host keeps late-acquisition cleanup debt until settled, cannot publish after close. |
| 12. Change native harness version while session/operation is live. | Same generic `agent` name does not preserve provider session/turn compat or identity. | Pin immutable selected binary/protocol/profile for entire operation; new generation only after explicit compatibility qualification. |
| 13. LangGraph `async` checkpoint or Temporal Activity crashes at exact boundary. | Completed work may be re-executed if its durable completion was lost; "durable" is not one guarantee. More subtly, [JS LangGraph `sync` still can lose mid-run checkpoints](https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/checkpointers.mdx#durability-modes), unlike the Python guarantee. | Owner reconciliation and separate external-effect idempotency; choose durability *per language and profile* and prove it. |
| 14. 1,000 "agents" configured but only 10 active operations. | Marketing count hides true capacity and per-tenant fairness. | Advertise active admitted physical execution plus workload, duration, failure profile and bounded resource metrics. |
| 15. Fully Local loses NATS or PostgreSQL during shutdown. | Gateway "active" status and HMR cannot restore physical custody/receipts. | Supervisor owns component lifecycle; Host records incomplete cleanup and refuses unsafe dispatch. |
| 16. Eager speculative fetch runs ahead of permissions. | "Read-only" may still leak data, consume quota or trigger vendor side effects. | Speculation deferred; any future fetch requires authentic source, authorized read scope, budget and cancelable token. |

### Round 2 reconciliation

No original recommendation requires a new central service. Two changes became stricter: **cross-principal same-turn injection is disabled by default** and **even read-only speculative retrieval requires explicit admission/budget**. Proposed tests T03/T07/T09/T14/T15/T21/T27/T31/T33 cover particularly expensive counterexamples.

## Round 3: devil's advocates for rejected options

This round actively tries to overturn the preferred design.

| Alternative worth defending | Strongest argument in its favor | Why it does not replace our current selection | Explicit reopen trigger |
| --- | --- | --- | --- |
| **DeepSeek central Router/Worker** | Single mental model, easier user-facing automatic triage and coherent global session context. | It would own others' source truth, Work, Runs and permissions; our distributed roles need independent tenancy/failure budgets. | Benchmark shows owner-local correlation fundamentally cannot deliver required cross-source routing without stronger common owner, with an accepted domain change. |
| **OpenClaw single Gateway per trust boundary** | Simpler deployment, powerful channels and steering, good local-first ergonomics. | Per-host trust boundary cannot by itself support mutually hostile users in one deployment, and per-tenant Gateway may amplify process/resource costs. | Product selects separately isolated per-tenant Gateway profile with validated economics; no shared-host authorization assumptions. |
| **Everything-is-a-plugin Cordis** | Maximal replaceability and lifecycle convenience, zero special core, rapid harness experimentation. | Static deterministic product composition + dynamic untrusted plugin operation are two different problems. Dynamic service context in Domain/Application undermines known dependency rules. | A real selected plugin consumer demonstrates static assembly cannot meet an explicit lifecycle/SPI contract under OD-043. |
| **LangGraph everywhere** | Rapid graph-based multi-agent control with a coherent checkpoint/HITL model. | Duplicates Work/Run/AR truth and requires replay discipline for external effects; not all domain actions are graph nodes. | A bounded single feature proves net operational simplification, identical effect semantics and adapter substitutability. |
| **Restate instead of Temporal + JetStream** | Journaling calls and virtual objects simplify durable service code and operating workflows; compelling unified developer experience. | Would reassign selected broker/transaction/workflow responsibilities across many accepted ADRs and introduce a second authority during migration. | Independent E2E and operations evidence demonstrates clear correctness + cost advantage for an **approved** replacement boundary. |
| **Always-on semantic watchdog** | An agent stuck in logically useless work may evade mechanical monitors for hours. | Subjective LLM evaluator can invent progress failures, cause escalation loops and spend unbounded tokens on fleet. | Failure corpus shows bounded deterministic triage misses an economically significant category with a measured precision/cost threshold. |
| **Safe-point steering as default** | User expects instructions while work runs, and native Codex/OpenClaw support exists. | At native boundary, yes, *when verified*; as a universal operation, no. Cross-principal work must be separately authorized. | Provider-native target certification yields exact receipt, lifecycle and supported safe-point behavior. |
| **Speculative execution** | Could materially reduce wall-clock latency for repeated tasks or prefetch high-latency context. | No proof of ROI; could accidentally mutate or leak, especially in local/tenant-constrained deployments. | Selected read-only consumer proves savings exceed complexity and quota costs under strict current read authority. |

### Round 3 decision state

**Retain current architectural direction.** Prefer targeted improvements: source-to-owner correlation, context-only pass-through, protected typed follow-up, native-capability steering with queue fallback, source-provenance context and conditional advisory progress checks. Keep Get Modular, separate Extension Foundation, Postgres/JetStream owners, selective Temporal adapter and AR custody. Nothing in this review justifies reversing accepted ADR-0114/0115/0117 or v3 S1–S5.

## Decision status and qualification

### Remaining unresolved questions — not falsely accepted

| Open decision | Concrete choice still needed | Minimum evidence before approval |
| --- | --- | --- |
| OD-026 | Who can add guidance, answer an agent, follow a thread or interrupt live Work across identity/channel boundaries? | Source × principal × permission matrix with multi-user and restart E2E |
| OD-031 | How do signed source identity, typed claim admission, delegation and conflicting event interpretations map to real Work? | Source-incarnation/dedup/provenance fixtures, zero privilege escalation |
| OD-032 | Which effects require last-mile permission checks, fencing and manual reconciliation? | Crash/unknown-outcome/partial remote effect adversarial tests |
| OD-033 | Which existing owner coordinates source-triggered wake and context activation, with no god coordinator? | Bounded per-tenant 1k-agent event/attention admission profile |
| OD-034 (deferred) | Whether first connector is an adapter vs distinct installation-management lifecycle owner. | First actual GitHub/chat integration requirements, revoke/cursor tests |
| OD-043 | Dynamic plugin process/worker isolation, generations, hot update, external artifact and cleanup semantics. | Two independent SPI implementations and forced-unload/rollback conformance |
| Agent Runtime successor | Which harnesses provide native in-turn steer/inbox/reconnect vs only next-turn, and which profiles qualify? | Real provider-native E2E (including lost ACK and cancellation), per binary/profile |
| Watchdog feature admission | What objectively counts as meaningful work progress; who can ask for a review? | Labelled failure corpus, precision/false-positive cost, no mutation authority |
| Local durability | Exact workflow engine and operational footprint for Fully Local if long-lasting workflows require it. | OD-035 and actual packaged offline resource/recovery evidence |

## Review coverage and completion conditions

Coverage lenses: DDD; distributed effects; security/tenant isolation; Runtime/provider; context/memory; plugin lifecycle; performance/cost; Fully Local operations; human collaboration; evidence/benchmark quality. Three argument passes are documented, with counterarguments and explicit reopen triggers. **This is not a substitute for external expert/model review or running code.** Later PR updates should append real reviewer identities, actual review comments, tested counterexamples and revisions; never retroactively label these notes as independent agent output.

Before any implementation, the semantic owner must publish a narrower proposed contract, test suite and deployment/target admission plan, secure user approval for changes to accepted boundaries, and record actual evidence. The [source catalog](agent-harness-source-catalog-2026-11-02.md) and [proposed E2E cases](agent-harness-patterns-antipatterns-e2e-2026-11-02.md) are the reusable research references.

## Evidence and sources

Reviewers' counterexamples reference the [competitor source catalog](agent-harness-source-catalog-2026-11-02.md), [problem/options record](agent-harness-mechanism-options-2026-11-02.md), [rejection tests](agent-harness-patterns-antipatterns-e2e-2026-11-02.md), and the current accepted ADR/open-decision boundaries. These sources document implementation designs and proposals, not executed adversarial checks for our target.

## Limitations and remaining questions

Ten lenses across three passes reflect authored critical analysis in this session; **no separate model instances, externally independent human reviewers, or highest-effort subagents were run**. Proposals need genuine additional technical review and cross-boundary E2E when implementation is admitted. The open-decision table above lists the remaining product-owner choices.
