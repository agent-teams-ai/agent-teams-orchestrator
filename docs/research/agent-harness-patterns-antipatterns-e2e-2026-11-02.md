---
id: research.agent-harness-patterns-antipatterns-e2e-2026-11-02
type: research
status: active
owner: architecture
summary: Reusable design patterns, known agent-harness anti-patterns, and concrete rejecting E2E scenarios for future approved owner-specific integrations.
related:
  - research.agent-harness-industry-design-review-2026-11-02
  - research.agent-harness-industry-source-catalog-2026-11-02
  - research.agent-harness-mechanism-options-2026-11-02
---

# Patterns, anti-patterns and E2E falsifiers (2026-11-02)

**Research reference only.** Codes `Pxx`, `Axx` and `Txx` below are local catalog identifiers, not accepted interfaces, not GitHub issue numbers and not implemented tests. They identify failure modes that an owning future slice should turn into automated contract/E2E fixtures. A positive pattern may be appropriate only in a qualified context. A test is **proposed**, not reported as passed.

## Scope and provenance

This 2026-11-02 catalog derives reusable mechanisms from the linked [first-party source inventory](agent-harness-source-catalog-2026-11-02.md). It maps possible failure modes to future owners; all T01–T36 entries are **proposed tests**, never executed results or accepted interface commitments.

## Findings and design options

### Positive design patterns

| ID | Pattern / proven usefulness | Fit and limits | Source |
| --- | --- | --- | --- |
| P01 | **Authenticate before semantic routing.** Resolve authenticated event source, source incarnation, sender and scope before LLM intent analysis. | OD-031 and a separately approved OD-034 integration. | [DeepSeek authorization](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/002-authorization.md) |
| P02 | **Deterministic hot gate, LLM slow advisory path.** Drop known noise without model spend; evaluate ambiguous allowed candidates later. | Model verdict proposes intent, does not grant mutation authority. | [DeepSeek study](https://x.com/deepseekharness/status/2116857257245987236); [OpenClaw standing intents](https://github.com/openclaw/openclaw/blob/main/docs/concepts/standing-intents.md) |
| P03 | **Stable source correlation and idempotent receipt.** An occurrence has original source identity across redelivery and reconnect. | No conflation of external source ID, canonical Work, Run or AR operation ID. | [DeepSeek domain](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/001-domain.md); [our eventing](../architecture/eventing-and-reliability.md) |
| P04 | **Context delivery != new instruction authority.** Existing task can observe a PR/CI comment without granting its author the right to start or change operations. | Split source facts, human instructions, approvals and commands. | [DeepSeek subscriptions](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/002-authorization.md) |
| P05 | **Existing-work owner fast path.** Validated events map to existing Work/Run without central model re-triage. | Needs source generation, subscriber scope, durable handoff and cleanup ownership. | [DeepSeek Engine](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/007-architecture.md) |
| P06 | **Explicit steering boundary.** Preserve running tool calls and transcript pairing; apply new guidance at a safe native model boundary. | Provider capability and authorization vary; always keep durable next-turn fallback. | [OpenClaw queue steering](https://github.com/openclaw/openclaw/blob/main/docs/concepts/queue-steering.md) |
| P07 | **Native protocol capability discovery.** Thread, Turn and Item identities are distinct; `turn/steer`, resume and interrupt are separately supported methods. | Each supported binary/protocol tuple requires qualification. | [Codex app-server](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md) |
| P08 | **Receipt stages instead of one success bit.** Stored, delivered, read by model, effect admitted, effect settled and shown to user mean different things. | Keep per-owner semantic proof and viewer read state separate. | [DeepSeek delivery/recovery](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md) |
| P09 | **Source-provenance context.** Version/permission/freshness metadata outlive summarization. | No untrusted memory-to-instruction promotion; Agent Context owner selects material. | [OpenClaw memory](https://github.com/openclaw/openclaw/blob/main/docs/concepts/memory-architecture.md) |
| P10 | **Sparse context + on-demand retrieval.** Compact initial snapshot with exact IDs for deeper source reads. | Authorize each fetch; bounded tokens/bytes/latency and stale-cache behavior. | [Deep Agents](https://github.com/langchain-ai/deepagents/blob/main/README.md) |
| P11 | **Managed independent subagent context.** Child specialist need not inherit all parent history or credentials. | Delegation is another authorized operation; parent and child effects have distinct identities. | [Deep Agents](https://github.com/langchain-ai/deepagents/blob/main/README.md); [Codex](https://github.com/openai/codex) |
| P12 | **Human approval survives suspension.** Record exact action request and approval decision; reconnect doesn't silently approve. | Revalidate at last-mile external effect. | [OpenAI Agents HITL](https://openai.github.io/openai-agents-python/human_in_the_loop/); [OD-032](../open-decisions/OD-032-last-mile-side-effect-safety.md) |
| P13 | **Tool-level authorization, even after handoff.** Top-level guardrail is insufficient when downstream specialists gain tools. | Enforcement is in owner use case, adapter and physical custody. | [OpenAI Agents handoffs](https://openai.github.io/openai-agents-python/handoffs/) |
| P14 | **Durable outcome plus original effect ID.** Local replay/retry cannot make an external write exactly-once. | Owner-specific reconciliation after unknown result. | [Temporal activity idempotency](https://github.com/temporalio/documentation/blob/main/docs/encyclopedia/activities/activity-definition.mdx) |
| P15 | **Different delivery/durability modes are explicit.** A fast async checkpoint has a crash gap; no durability by default inference. | Qualify exactly one declared profile per capability. | [LangGraph checkpoints](https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/checkpointers.mdx) |
| P16 | **Controller state separate from process custody.** Worker stop/readiness does not grant business ownership. | Orchestrator and AR v3 have distinct owners, Host/supervisor roles. | [Our AR v3](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/agent-runtime-architecture-program-plan.md) |
| P17 | **Plugins behind product-owned ports.** Manifest and runtime SDK do not enter domain; external outputs are validated. | Keep Get Modular static composition and separate Extension Foundation. | [Our extension points](../architecture/extension-points.md) |
| P18 | **Plugin loader instance alignment.** A host-shared runtime instance can matter to lifecycle and type identity. | Requires explicit exact-release/singleton compatibility, not accidental nested package copies. | [OpenCode plugin V2](https://github.com/anomalyco/opencode/blob/dev/packages/plugin/README.md) |
| P19 | **Multi-host workflow without second owner.** Orchestrator can choose a durable workflow adapter while owning commands/outbox. | Do not unify AR technical journal with product workflow history. | [Temporal](https://docs.temporal.io/workflows); [our eventing](../architecture/eventing-and-reliability.md) |
| P20 | **Health vs semantic progress separation.** Monitor resource and journal state cheaply; evaluate content only when a bounded alert justifies it. | Semantic judge advisory, never a secret-bearing tool owner. | [Our reliability objectives](../architecture/reliability-objectives.md) |
| P21 | **Independent agent identity, session and work scope.** One participant definition, many run snapshots, separately authorized execution operations. | Preserve ADR-0100/0101 occupancy, don't equate agent with process. | [Team roster ADR](../decisions/0101-run-specific-rosters-coordination-and-exclusive-agent-occupancy.md) |
| P22 | **Failure-safe local profile.** One shared logical contract with qualified local infrastructure profile and finite capacity. | Native PostgreSQL/JetStream under explicit Supervisor; do not silently introduce alternate semantics. | [Our deployment profiles](../architecture/deployment-profiles.md) |

### Rejected anti-patterns

| ID | Anti-pattern / exact failure | Required countermeasure or deliberate defer |
| --- | --- | --- |
| A01 | One LLM evaluates every incoming notification and becomes the universal task-creation authority. | Owner-local deterministic filter; LLM classifier only advisory after scope admission. |
| A02 | GitHub issue/PR comment text, webhook payload or retrieved document declares a new authorized command. | Source fact + authenticated sender + typed owner admission, never string-based grant. |
| A03 | Single mutable `Ticket`, `Agent`, or `Mandate` aggregate subsumes Work, Run, Communication, auth, runtime operations and memory. | Respect bounded contexts and published language; no shared god-object. |
| A04 | A PR subscription or channel membership automatically gives its writers access to original agent tools. | Current principal/permission check; context-only delivery by default. |
| A05 | **Cross-principal steering under another participant's preauthorized execution identity.** | Refuse as in-turn instruction by default; authorize a distinct new execution or explicit narrow delegated policy. [OpenClaw documents this effect](https://docs.openclaw.ai/concepts/queue-steering). |
| A06 | Tool running now is assumed canceled because new user text arrived or websocket disconnected. | Keep cancellation and steering separate, report physical stop evidence. |
| A07 | Treat a native `turn/steer` ACK as proof the model consumed the content. | Distinct native accepted/consumed/outcome status and uncertainty handling. |
| A08 | Emulate live steering by blindly killing/relaunching CLI harness. | Capability negotiation and safe next-turn fallback, exact session generation. |
| A09 | Resubmit after unknown commit, tool effect, native request or approval reply. | Original stable request ID, owner-specific readback/reconciliation and physical fence. |
| A10 | "Exactly once" claimed from message broker, Activity completion, or checkpoint alone; assumes JavaScript LangGraph `sync` equals Python `sync` before the next step. | Reconcile external side effects; qualify per-language Temporal/Restate/LangGraph guarantees. [JS/Python checkpoint difference](https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/checkpointers.mdx#durability-modes). |
| A11 | Latest state watcher used as durable event history or approval receipt. | Use owner journal/feed/outbox; Observation may coalesce and lose intermediate values. |
| A12 | Prompt/compression summary gains higher authority than underlying source. | Immutable provenance, signed/admitted scope and trust-tagged context. |
| A13 | Memory auto-promotes external web/CI text into permanent instructions or skills without approval/gates. | Separate source class, promotion policy and reviewable audit. |
| A14 | "Self-improving agent" rewrites runtime permission enforcement on its own. | Harness configuration/product policy changes require independent owner authorization and tests. |
| A15 | Watchdog LLM automatically retries failed merge, deploy or payment on subjective stall detection. | Advisory alert only; typed decision by semantic owner, idempotent effect proof. |
| A16 | One observer/model call per agent every few seconds, regardless of workload. | Bounded event-driven measurements, coarse sweeping and suspicion-triggered assessment. |
| A17 | Universal dynamic plugin service registry in Domain/Application, or loaded plugin bypasses ACL. | Get Modular selected graph, owner ports, sandboxed untrusted SPI and host admission. |
| A18 | Unload/hot swap assumed complete while old plugin's promises or resources remain live. | Generation fencing, drain, retained cleanup debt, conformance or explicit refusal. |
| A19 | Signed OCI artifact treated as trustworthy execution permission. | Signature/provenance + installation consent + current grants + sandbox enforcement are separate. |
| A20 | One per-agent SQL pool, broker consumer, Dapr sidecar or separate Orchestrator process. | Share qualified coarse worker roles and logical durable subscriptions, enforce bounded budgets. |
| A21 | Worker lease expiry treated as proof its OS process can no longer write. | Receiver-side fencing/cutoff and physical custody before placement reuse. |
| A22 | Local offline profile silently falls back to SQLite/PGlite or SaaS for convenience. | Respect accepted native PostgreSQL and self-contained profile; report startup resource trade-off explicitly. |
| A23 | Historic AutoGen designs treated as actively supported Microsoft's current framework. | [AutoGen is archived](https://github.com/microsoft/autogen/blob/main/README.md); compare Microsoft Agent Framework instead. |
| A24 | Design benchmark assumes implementation is completed, or 10k queued records equals 10k running agents. | Compare *design* equally but capacity claims only through measured admitted executing load. |

### Proposed E2E/conformance scenarios for owning slices

A scenario records the **owner whose test must assert the invariant**. No scenario should be implemented in a generic repository-wide mega harness. Prefer end-to-end coverage of cross-boundary failure modes, with narrow unit/property tests for critical state machines and parsers.

| Test | Fault / stimulus | Required oracle | Owner |
| --- | --- | --- | --- |
| T01 | Duplicate webhook (same source ID, varied delivery ID) | One admission/outcome, original occurrence and audit preserved | Integration adapter + semantic owner |
| T02 | Delayed, reordered CI and review events | No stale override or repeated work activation | Source + Work owner |
| T03 | Webhook signature bad, source access revoked | No authenticated candidate; previous work does not gain new rights | Source/auth |
| T04 | Connector uninstalled and reinstalled under same external ID | New source incarnation and cursor; stale subscription cannot confer authority | OD-034 future owner |
| T05 | External comment tries to assign privileged tool command | Context allowed only under disclosure, instruction rejected | Work/Attention |
| T06 | Existing Work has two source threads; one is deleted | Recorded correlation and explicit closure, not silent event loss | Communication/Work |
| T07 | Actor B posts while actor A's privileged turn runs | No B-authorized injection under A grants; distinct scoped followup | Run/AR adapter |
| T08 | Same actor steers during running tool | Already started effect not doubled/stopped; native accepted/consumed tracked separately | AR |
| T09 | `turn/steer` native ACK is lost after provider accepted | No blind resubmission; reconcile or surface unknown | AR |
| T10 | Provider has no steering capability | Durable next-turn path, no fabricated same-turn support | AR |
| T11 | Approver revoked after approval saved but before effect | Last-mile refusal/fence, truthful outcome | Approval / effect owner |
| T12 | Existing Work attempts resume after Run generation retired | Stale generation cannot produce new admitted execution | Run / AR |
| T13 | Crash after source event transaction, before inbox/outbox publish | Exactly one owned admission; eventual relay with original identity | Ingress/work |
| T14 | Crash after external PR merge, before result ACK | Reconciliation by original intent; no second merge/retry | Effect owner |
| T15 | Owner lease expires while delayed OS process still runs | No effects or output accepted from stale generation | AR native custody |
| T16 | Read-only observation stream coalesces during high output | Durable final query remains exact; UI never treats watch as receipt | AR/Observation |
| T17 | Workspace materialization fails partially | Cleanup-only custody retained and visible; no phantom healthy Run | Workspace/AR |
| T18 | Output byte cap + very slow UI reader | Bounded memory, explicit gap/truncation; cancellation reserve survives | AR/Feeds |
| T19 | One tenant floods duplicate inputs and LLM candidates | Bounded ingress, fair admission, no other tenant starvation | Ingress/Capacity |
| T20 | Untrusted README attempts permanent memory instruction | Preserved source label; cannot promote to owner instruction automatically | Agent Context |
| T21 | Source revision and current permission change during context assembly | Manifest/version/revocation rechecked before disclosure | Agent Context |
| T22 | Long context exceeds token budget | Required policy/action evidence not silently elided; bounded retrieval and truncation | Agent Context |
| T23 | Subagent handoff to more capable specialist | No permission escalation without new explicit delegation | Run/AR |
| T24 | Watchdog sees lengthy quiet but valid native compile | No auto-cancel; uncertainty and liveness not interpreted as semantic failure | Monitoring |
| T25 | Watchdog detects repeated no-op commit cycle | Bounded advisory escalation, no unapproved effect retry | Work/Monitoring |
| T26 | Watchdog's own checker fails/restarts | Main execution unaffected; monitoring debt visible | Monitoring |
| T27 | Plugin disable races with in-flight outbound effect | Old generation fenced; unknown effect reconciled; no double owner | Extension Host |
| T28 | Valid signed plugin tries another tenant's tables/credentials | Runtime sandbox and product authorization refuse | Extension Host/owner |
| T29 | Plugin bundles incompatible runtime singleton | Loader rejects compatibility before activation | Extension Host |
| T30 | Rollback after incomplete plugin resource cleanup | No false ready; debt retained; old/new cannot both mutate | Extension Host |
| T31 | Temporal/Restate/LangGraph replay after external write | No repeated effect without recipient idempotency; reconcile unknown | Workflow owner |
| T32 | Long human approval wait through reboot/upgrade | Approval scope/revision retained; no auto approval or zombie task | Run/Approval |
| T33 | Fully Local starts with network unplugged | No remote authority, finite bundled PostgreSQL/JetStream cost, explicit degraded capabilities | Local Host |
| T34 | Server role restarts while many Runs active | Owned work recovers by original receipts; no per-Agent sidecars/consumers | Deployment |
| T35 | Mixed-version service rollout with old event schema | Compatible readers, one mutation owner, explicit quarantine on unsupported event | Semantic owner |
| T36 | Largest advertised actual concurrent agent workload | Measured admitted executions, fairness/latency/CPU/RAM/SQL/NATS/output/backpressure/failover | Capacity/AR + Orchestrator |

### Practical initial acceptance slices

**Slice A — source-to-existing-work continuity** (requires OD-026/031/033 plus first approved source): T01–T07 and T13. Must not build a global Router. **Slice B — native in-turn guidance** (AR decision and qualified provider): T07–T12. Must not start with blanket provider claims. **Slice C — context provenance**: T20–T22. **Slice D — advisory monitoring**: T24–T26. **Slice E — dynamic extension activation** after OD-043: T27–T30. **Slice F — durable/resilience qualification** in the relevant existing lanes: T14–T19, T31–T36.

Each slice defines exact target/profile, binary releases, budget, reporting and mandatory negative fixtures **before** implementation. These are additional ideas for a future authorized program, not user-visible promises of existing features.

## Decision status and qualification

None of these patterns authorizes adding packages, services, plugins or domain commands. Real tests require an owner-selected target/profile, a relevant accepted contract, and implementation-start approval. The accepted [eventing](../architecture/eventing-and-reliability.md) and [extension](../architecture/extension-points.md) documents retain authority.

## Evidence and sources

Rows P01–P22 carry primary-source or owning-ADR links where the pattern was observed; A01–A24 and T01–T36 additionally synthesize counterexamples from the [mechanism comparison](agent-harness-mechanism-options-2026-11-02.md) and [adversarial ledger](agent-harness-adversarial-reviews-2026-11-02.md). Source observations do not assert that a third-party provider has passed our particular test.

## Limitations and remaining questions

No listed test has been run in this research PR. Runtime E2E, packaging, large-fleet qualification and multi-tenant security tests need actual configured targets, fixtures and acceptance gates in their owning implementation slices; selected test names may change when those contracts are approved.
