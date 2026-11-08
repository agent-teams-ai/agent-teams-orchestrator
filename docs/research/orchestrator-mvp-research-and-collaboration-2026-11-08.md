---
id: research.orchestrator-mvp-research-and-collaboration-2026-11-08
type: research
status: active
owner: architecture
summary: Dated collaboration proposal and research plan for a configurable, recoverable multi-agent orchestration prototype.
related:
  - ADR-0027
  - ADR-0072
  - ADR-0079
  - ADR-0114
  - ADR-0116
  - OD-004
  - OD-005
  - OD-013
  - OD-026
  - OD-027
  - OD-028
  - OD-033
  - OD-048
  - architecture.overview
---

# Orchestrator MVP Research and Collaboration Plan, 2026-11-08

## Scope and provenance

**Draft collaboration proposal: an orchestration proof of concept, followed by
a small integrated MVP.** Test the difficult mechanisms before committing to
the complete platform architecture.

The product owner's discussion with Hassan identified an AI Product Blueprint,
autonomous task planning, and an evidence-based feedback loop as useful first
applications of a general orchestration system. They do not fix the product to
software development, particular roles, or a Claude-to-Codex sequence.

Research date: **2026-11-08**. Method: repository and upstream source review;
the proposed experiments below have not been executed. Reviewed baselines:

- [Orchestrator at a34587b](https://github.com/agent-teams-ai/agent-teams-orchestrator/tree/a34587b313e656eeb43d755b4a4f08c40dff2116).
- [Agent Runtime at f990acc](https://github.com/agent-teams-ai/agent-runtime/tree/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e).
- [OpenCode 2.2.6 at dc2ffcf](https://github.com/anomalyco/opencode/tree/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06).

The document's `active` metadata means active research. It grants no production
implementation admission and changes no accepted ADR. Links to `main` below
provide current navigation; these commits fix the reviewed baseline.

## Findings and design options

### Goal and size

Build the smallest environment in which a user gives work to a team, agents
coordinate and review results, new information can change ongoing work, and
interrupted work continues without losing recorded progress. Start with two
teams, three or four agents, and one disposable project. This tests mechanisms,
not the eventual 10,000-agent capacity target.

Keep TypeScript, Clean Architecture, SOLID, and explicit ownership. External
dependencies sit behind narrow consumer-owned ports. Implement only operations
needed by the selected experiment. Completing the module/plugin ecosystem,
every planned context, a cloud control plane, or a polished desktop integration
is outside this proof of concept.

Hassan can choose any workstream by interest and experience. The product owner
maintains the overall architecture and has substantial runtime and input
delivery experience; that direction is not automatically assigned to Hassan.
Both can contribute across boundaries.

### Workstreams to choose from

| Workstream | Question and smallest useful result |
| --- | --- |
| Configurable workflows and authoring | Research existing libraries, formats, and industry approaches. Compare two different team processes and recommend a definition model and editor strategy before implementation. |
| Tasks and continuous execution | Authorized users and agents create, inspect, update, and coordinate Tasks. Dispatch eligible work until completion, blocking, pause, or an explicit budget. Recover a missed wake without a busy loop. |
| Runtime integration | Qualify OpenCode as one initial harness behind a replaceable adapter: actual providers, authentication, input, cancellation, and recovery. |
| Durable processes and recovery | Use Temporal and PostgreSQL to recover waits and progress after a crash. Exercise JetStream redelivery and reconcile uncertain external operations. |
| Feedback, priority, and attention | Accept user and teammate messages, requirement changes, and service events durably. Apply routine updates at safe points; preserve progress before an urgent switch. |
| Task continuity and collaboration | Resume with the same executor, hand work to another, and let two authorized executors contribute to one Task. Compare a bounded LangGraphJS adapter with the simpler baseline. |
| Agent and team communication | Test direct and group conversations, configurable cross-team routing, and leader-oriented user interaction. Research protocol reuse. |
| Evidence and next-phase loop | Inspect artifacts, compare results with acceptance criteria, request rework, and plan the next eligible step. Use Hassan's product-development example as a configurable fixture. |

Every row is in the research scope. Comparing libraries does not commit us to
building every candidate. The integrated MVP uses jointly agreed options and
records deferred or unsupported capabilities explicitly.

### Baseline and responsibility boundaries

Start with TypeScript/Node, context-owned PostgreSQL, Temporal, and direct NATS
JetStream integration. Include JetStream in the first integrated prototype.
[ADR-0114](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0114-canonical-backend-stack-and-distributed-role-adoption.md)
owns backend adoption;
[ADR-0116](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0116-native-temporal-for-fully-local-durable-workflows.md)
also selects full native Temporal with PostgreSQL for Fully Local workflows.

| Concern | Owner or role |
| --- | --- |
| Task identity, assignments, lifecycle, completion, and task lists | Work Coordination and its PostgreSQL state. Temporal visibility is not the product task database. |
| Durable waits, scheduling, retries, and execution progress | Feature-owned application processes through a Temporal adapter, rather than one global workflow owning every domain. |
| Committed facts and asynchronous integration | JetStream adapters with durable consumption, deduplication, and acknowledgement after the relevant application commit. |
| Runtime session and provider controls | Agent Runtime owns execution custody and technical lifecycle. Orchestrator's Runtime ACL translates consumer-owned intents and observations. |
| Messages, attention, context, and activation | Communication owns messages; Attention proposes relevance/disruption; Context owns semantic manifests; Run decides wake, resume, pause, and replacement. |
| Public API | UI/CLI/SDK to Protobuf/Connect to the owning application port. Fastify and the Connect adapter share one HTTP server. |

Connect belongs at that public API boundary. In-process collaboration stays
typed calls; JetStream does not become the SDK's task API. Private gRPC/Dapr
applies where a separately deployed service needs it, not to every function.
See [SDK and transports](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/sdk-and-transports.md).

Use a deterministic fake runtime for failure fixtures and a selected real
runtime for a small end-to-end demonstration. A passing fake does not qualify
the real provider. An initial direct OpenCode adapter may be a disposable
execution substitute behind the runtime port; it does not establish a new
production owner or require completing all of AR first.

### Workflow research: more than drawing boxes

A database persists data; it does not define what a process means. Compare
these layers separately:

| Layer | What must be represented or decided |
| --- | --- |
| Authoring | Canvas, forms, validation feedback, variables, undo, and usable editing. |
| Definition | Steps, branches, waits, bounded loops, inputs, roles, routing permissions, and immutable revisions. |
| Execution | Active step, accepted events, timers, retries, cancellation, and recovery. |
| Product state | Current Tasks, assignments, messages, context, artifacts, and authority. |
| Persistence | How each owner stores its definitions, state, and history. |

[React Flow](https://reactflow.dev/learn/advanced-use/computing-flows) supplies
interactive nodes and edges, node data, connection utilities, and hooks for
data propagation. It is more than a picture, but does not supply our durable
execution semantics.
[FlowGram](https://github.com/bytedance/flowgram.ai/blob/main/README.md) offers
a broader toolkit: canvas, forms, validation, variable scopes and type
inference, reusable node materials, and runtime-related facilities. Evaluate
its framework and desktop product separately; neither establishes that its
executor meets our Temporal recovery requirements.

Compare both on review/rework within one team and delegation with parallel
work and review across two teams. Change contact/delegation topology between
the fixtures, not only role names. Check headless definition access, versioning,
type/variable validation, custom nodes, accessibility, licensing, maintenance,
and custom code. Stars are a secondary signal. Inspect
[Langflow](https://github.com/langflow-ai/langflow) and
[Node-RED](https://github.com/node-red/node-red) as integrated editor/executor
references; adopting their execution model needs a separate justification.

Deliver a recommendation and a jointly reviewed small demo plan. We may use an
editor separately from execution or adopt more of a framework. A production
visual builder is not required for this research phase.

[Open Workflow Specification](https://github.com/open-workflow-specification/specification/blob/main/dsl-reference.md)
provides a declarative vocabulary for calls, conditions, loops, events, waits,
and errors. It could reduce custom format design and support validation and
interchange. It supplies neither our database nor an automatic Temporal
implementation. Compare a supported subset with a small project-owned schema;
record unsupported features and mappings. Do not promise lossless portability.
This specification is distinct from the `openworkflow` engine studied in OD-035.

**Temporal remains the durable engine baseline.** XState is only an optional
helper for pure transition logic if it reduces code or improves validation.
It is not a replacement for Temporal selected by this plan. Deterministic
orchestration means recorded inputs and rules govern permitted transitions;
it does not mean identical LLM answers. Prompts describe responsibilities but
do not enforce assignment or completion rules.

### OpenCode as the initial runtime candidate

OpenCode 2.2.6 could reduce initial integration work, but its routes differ:

- **Claude Agent** launches installed Claude Code through the official Claude
  Agent SDK. OpenCode owns tools, permissions, subagents, compaction, and
  canonical history; this is not the unchanged native Claude Code harness.
- **OpenAI/ChatGPT** routes call model endpoints. They do not launch the Codex
  SDK, CLI, or App Server. Access to associated models or a ChatGPT login does
  not demonstrate native Codex runtime behavior.

Sources: pinned
[Claude Agent documentation](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/services/site/src/docs/content/claude-agent.mdx),
[Claude SDK integration](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/core/src/plugin/provider/claude-agent/claude/session.ts),
[ChatGPT provider](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/core/src/plugin/provider/chatgpt.ts),
and [OpenAI provider](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/core/src/plugin/provider/openai.ts).

Choose one hosting form after a compatibility check: client/server or embedded
SDK. The [embedded SDK](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/sdk/README.md)
needs an explicit persistent database for restart tests. Qualify selected
authentication routes in the intended deployment profile; local subscription
support does not qualify a shared hosted service. See
[Anthropic's plan guidance](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
and [OpenAI's OSS guidance](https://developers.openai.com/siwc/token-sharing-open-source).

Claude Agent needs a logged-in Claude binary on the execution host (at least
2.1.248 for this reviewed version). The provider excludes OpenCode's native
remote-workspace mode and hosts without process spawning. A remotely accessed
server running a local workspace is a separate hosting case to test.

Observe durable queued/steered input, cancellation acceptance versus settled
execution, restart, history reconciliation after disconnect, and bounded tools.
OpenCode's [restart code](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/core/src/session/execution/restart.ts)
explicitly has at-least-once recovery and assumes the previous owner is dead.
Its [normal subscriptions](https://opencode.ai/docs/build/client/) are live-only;
the experimental durable log needs separate qualification.

The owning application preserves business operation identities and reconciles
uncertain effects. Distinguish native provider resume from reconstruction using
saved semantic context: record Orchestrator recovery, OpenCode session recovery,
and native Claude continuation or context rebuild as separate observations.
A rebuild must not be reported as native resume. If native Codex behavior is
necessary, compare a direct adapter without changing the application contract. Existing
[AR OpenCode ACP evidence](https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/docs/spikes/opencode-acp-1-18-25-contract-validation.md)
targets older versions and does not qualify this v2 route. This proposal does
not migrate existing desktop integrations.

### Feedback, checkpoints, and task continuity

Treat incoming information as durable input with source, target, identity,
priority, revision, and application status. Proposed delivery classes are
routine input at the next safe point, an important update before further
relevant actions, and urgent interruption. Map these to actual runtime
capabilities in the experiment. Delivery acknowledgement is not proof that the
model understood or acted on an update. Feedback and test results are inputs or
evidence; they do not grant permission. Urgency informs authorized Run policy,
and neither an agent's approval nor a priority label creates authority.

Before a planned urgent switch, preserve progress and settle or explicitly
classify in-flight operations. A crash may prevent a fresh checkpoint: recovery
also needs the last durable state and operation journal. Team stop prevents
new dispatch and requests cooperative interruption at a supported boundary.
Classify active work as settled, still stopping, or unknown; a stop request is
not proof of a stopped process. Preserve stopped intent across controller
restart until explicit Resume. Terminal cancellation remains distinct.
Resume re-checks requirements, permissions, feedback, and workspace state.

A transferable Task progress record should reference:

- Task and definition revisions, current step/attempt, completed work, and
  next intended action;
- context sources, pending inputs, relevant message cursors, and omissions;
- workspace/base revision, recoverable content, artifacts, and test evidence;
- accepted external operations, receipts, and unresolved outcomes;
- target assignments and authority required for the next activation.

The record references separately owned state, not a new universal checkpoint
aggregate. Old checkpoints cannot overwrite newer Task requirements. Native
provider hidden state is not promised to transfer between providers.

Research whether **LangGraphJS associated with a Task** improves step history,
handoff, and continuation enough to justify another checkpoint/versioning
surface. Compare Temporal with an owned application process against Temporal
with a bounded graph adapter on the same fixture. Decide whether graph state
is execution-local progress or product coordination; identify one owner for
each transition, retry, and external effect. Current
[extension points](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/extension-points.md)
describe optional agent-local graphs. A graph shared across Task executors is
a research proposal, not an existing accepted contract.

For the graph comparison, record the exact JS/checkpointer versions and crash
between a completed node or external effect and persisted checkpoint. A
cooperative pause alone is insufficient recovery evidence.

[OD-048](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-048-mixed-human-and-ai-team-participation.md)
accepts the product direction of multiple equal human/agent executors on one
Task. Test handoff and concurrent contributions. A minimal fixture can use
separate writer workspaces and an explicit integration step. Git worktrees
alone are not process isolation. Exact assignment, handoff, conflict, and
completion contracts still require agreement.

### Communication standards and groups

| Candidate | Useful boundary | What remains ours |
| --- | --- | --- |
| [A2A](https://a2a-protocol.org/latest/specification/) | External agent discovery, messages, tasks, artifacts, and status exchange. | Product groups, authoritative history, attention, and permission to act. |
| [AGNTCY SLIM](https://slim.agntcy.org/latest/slim/architecture/sessions/group/) | Direct and many-to-many group transport, membership mechanics, optional encryption, and configurable acknowledgement/retry. | Membership policy, durable offline mailbox, complete history, and Task ownership. |
| [Agent Client Protocol](https://agentclientprotocol.com/protocol/v1/session-setup) | Client-to-coding-agent runtime integration, including optional session load. | Peer group coordination and portability of provider state. |
| [MCP](https://modelcontextprotocol.io/specification/2026-07-28), with its opt-in [Tasks extension](https://tasks.extensions.modelcontextprotocol.io/specification/2026-07-28/tasks) where supported | Tools/resources and negotiated asynchronous task operations. | Product Task ownership, group conversations, and injection into a busy model turn. |

A2A does not require complete message history or universal message idempotency.
SLIM's optional session persistence is not an application mailbox. Test through
our owned acceptance and reconciliation boundaries. The older BeeAI Agent
Communication Protocol is a different ACP and moved into A2A; do not start a
second integration with that archived protocol.

An optional A2A probe uses one external endpoint: delegation, input-required
feedback, duplicate send, disconnect/query, cancellation, and late result.
Defer adoption if the first application needs no external interoperability.

The SLIM spike compares three participants, DM and group delivery, removal,
offline recovery, and restart with a JetStream-based baseline. Its technical
moderator can be infrastructure, without forcing a leader-agent role. Adopt
SLIM only if it adds useful interoperability or transport behavior. The
experimental A2A-over-SLIM binding is not mandatory.

Our product defines membership, cross-team contact permissions, who wakes, and
when to contact a human. A leader-oriented default can minimize interruptions;
configuration can choose one, several, or no designated contact agents. Agree
history visibility for joined/removed members and whether recipients are fixed
at acceptance or resolved at delivery. Test queued input across a membership
change. Group delivery must not automatically launch every recipient's LLM.

## Decision status and qualification

### Collaboration and implementation sequence

1. **Choose a workstream.** Hassan selects what interests him; agree its
   question, scope, dependencies, and smallest useful result together.
2. **Review before each implementation experiment or increment.** The
   contributor writes a short approach: ownership, ports, state, pinned
   dependencies, failure cases, alternatives, and expected evidence. The
   product owner reviews and discusses it before implementation begins.
   Changed ownership or failure semantics require a revised approach.
3. **Build the agreed experiment.** Keep it bounded and replaceable.
   AI-assisted implementation is welcome; record actual observations.
4. **Review evidence.** Decide adopt, revise, or defer. Update the owning open
   decision or ADR normally when the result changes architectural direction.
5. **Integrate selected mechanisms.** Start with durable Tasks/processes,
   PostgreSQL, JetStream, and one runtime. Add agreed communication, attention,
   continuity, and feedback fixtures through small reviewed increments.

This supports asynchronous contributions without a full-time commitment. The
plan allocates technical work only; ownership and commercial terms remain a
separate agreement. No token or revenue promise is implied.

### Acceptance evidence for the integrated prototype

| Case | Observable result required |
| --- | --- |
| Human and agent task management | Both use authorized operations; conflicting revisions are detected. Eligible work continues without manual prompts. Blocked work remains visibly blocked. |
| Configurable process | After the authoring decision, two workflow definitions with different roles, routing, and review policies run without engine code changes. Invalid transitions and unauthorized delegation are rejected. |
| Evidence and rework | An incomplete result receives findings, is corrected, and meets criteria against the exact candidate/artifact revision. Later contributions invalidate stale evidence. Budget and rework limits apply. |
| Routine and urgent feedback | Routine input survives to its safe point. A qualified urgent mode preserves progress and applies updated context before further relevant actions. Unsupported, deferred, or unknown outcomes remain explicit. |
| Stop and crash recovery | Stopped intent survives controller restart until Resume; cancellation is distinct. Classify active work and record Orchestrator, harness, and provider recovery separately. Query uncertain effects before repeating them. |
| Handoff and shared work | B receives current context, including feedback arriving during handoff. Obsolete executor writes are rejected. Two current authorized executors can also contribute without losing work. |
| Conversations and cross-team policy | DM and group history survives interruption; only eligible recipients wake. Removed participants cannot receive new restricted messages. Delegation follows configured rules. |
| Redelivery and late results | Duplicate JetStream delivery, missed wake, and late result after cancellation do not create duplicate product transitions or complete the wrong attempt. |

Capture definition versions, transitions, operation IDs, message cursors,
artifact digests, restart points, and actual results. Distinguish transport
receipt, application acceptance, context application, and Task completion.
An engine cannot make an arbitrary external operation exactly once; unknown
outcomes remain visible until reconciled.

Review findings are advisory inputs or typed evidence bound to an immutable
candidate/artifact revision. Work Coordination validates the applicable
completion plan and commits completion. A reviewer, graph, or successful
runtime exit cannot independently complete the product Task.

### Preliminary comparison effort

Engineering judgments below cover **one bounded comparison fixture**, not
measured reliability, product estimates, or delivery commitments. Reliability
means expected robustness for that role; confidence means evidence strength;
complexity includes implementation and operation. Scores are out of 10.
Hand-maintained line ranges exclude vendor/generated code, complete IAM,
deployment packaging, and scale qualification. Revise them after the first
experiment; rows are not additive project totals.

| Candidate and scope | Reliability | Confidence | Complexity | Integration / tests / configuration lines |
| --- | --- | --- | --- | --- |
| OpenCode input/recovery adapter | 6 | 5 | 5 | 400–900 / 500–1,000 / 50–150 |
| Direct native adapters for the same fixture | 7 | 6 | 7 | 800–1,800 / 800–1,600 / 50–200 |
| Temporal with owned progress records | 8 | 7 | 5 | 400–900 / 500–1,000 / 50–150 |
| Temporal plus bounded LangGraphJS | 7 | 4 | 7 | 600–1,200 / 700–1,400 / 50–150 |
| Optional XState helper, incremental | 7 | 5 | 3 | 100–250 / 150–350 / 0–50 |
| React Flow editor demo | 7 | 6 | 6 | 500–1,000 / 200–450 / 50–100 |
| FlowGram editor demo | 7 | 4 | 5 | 300–700 / 200–450 / 50–150 |
| Open Workflow subset mapping | 6 | 4 | 6 | 250–650 / 300–700 / 50–150 |
| Small project-owned definition schema | 7 | 5 | 4 | 200–500 / 250–600 / 50–150 |
| JetStream group delivery fixture | 8 | 6 | 5 | 300–700 / 400–900 / 50–150 |
| SLIM group adapter, incremental | 6 | 4 | 6 | 200–500 / 400–800 / 50–150 |

## Evidence and sources

### Canonical architecture reading map

These sources contain the full design and unresolved questions. This proposal
is a navigation and experiment plan, not a replacement architecture authority.

| Topic | Absolute GitHub reference |
| --- | --- |
| Overall control plane | [Orchestrator architecture](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/overview.md) |
| Shared stack and practices | [Backend stack](https://github.com/agent-teams-ai/.github/blob/main/docs/backend-stack.md), [Engineering Quality Standard](https://github.com/agent-teams-ai/.github/blob/main/docs/engineering-quality-standard.md) |
| Task ownership and collaboration | [Work Coordination](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/domain/contexts/work-coordination/README.md), [OD-048 participation](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-048-mixed-human-and-ai-team-participation.md) |
| Process ownership and Temporal | [Run Orchestration](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/domain/contexts/run-orchestration/README.md), [ADR-0027](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0027-temporal-as-run-orchestration-adapter.md), [OD-005 boundaries](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-005-temporal-workflow-boundary.md) |
| Configurable lifecycle | [OD-027](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-027-configurable-work-lifecycle.md) |
| Communication and attention | [OD-026](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-026-communication-notification-and-attention.md), [Agent Attention](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/domain/contexts/agent-attention/README.md) |
| Context, feedback, and resumption | [Agent Context](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/domain/contexts/agent-context/README.md), [OD-028 lifecycle](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-028-agent-context-lifecycle.md), [OD-033 convergence](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-033-ooda-convergence-and-context-activation.md) |
| Runtime boundary and failures | [Runtime boundary](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/runtime-boundary.md), [ADR-0079 authority](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0079-runtime-authority-binding-cutoff-and-disposition.md), [OD-004 ports](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-004-runtime-capability-ports.md), [OD-013 partial failure](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-013-partial-failure-and-compensation.md) |
| Completion and evidence | [ADR-0072](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0072-atomic-work-completion-evaluation.md) |
| Workspaces and continuation | [ADR-0062](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0062-workspace-materialization-and-runtime-isolation.md), [ADR-0069](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0069-opaque-runtime-execution-identity.md) |
| Runtime design and OpenCode | [AR reading order](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/README.md), [AR foundation](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/architecture-foundation.md), [AR OpenCode integration](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/opencode-integration.md) |
| Platform relationship | [Platform-Orchestrator boundary](https://github.com/agent-teams-ai/agent-teams-platform/blob/main/docs/architecture/platform-orchestrator-boundary.md) |
| Reusable foundations | [Get Modular](https://github.com/agent-teams-ai/get-modular), [Extension Foundation](https://github.com/agent-teams-ai/extension-foundation), [Engineering Foundation](https://github.com/agent-teams-ai/engineering-foundation) |

### Existing evidence and upstream references

Reuse scenarios and bounded mechanics from the retained
[Temporal research source](https://github.com/agent-teams-ai/agent-teams-orchestrator/tree/a34587b313e656eeb43d755b4a4f08c40dff2116/scripts/research/od035/temporal)
and its [evidence manifest](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/a34587b313e656eeb43d755b4a4f08c40dff2116/docs/research/evidence/od035-2026-10-23/manifest.json).
That small business fixture is not the production Work model. Older July
foundation harnesses were deleted; their retained counts are not rerunnable
source or new execution evidence.

Inspect the [interactive provider experiment](https://github.com/agent-teams-ai/agent-runtime/blob/main/experiments/interactive-provider-contract/README.md)
and [runtime evidence index](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/evidence-traceability.md)
before duplicating runtime work. Preserve each experiment's version, platform,
fake/live boundary, and unresolved gates.

Additional primary references for the proposed comparisons:

- [Temporal TypeScript message passing](https://docs.temporal.io/develop/typescript/message-passing).
- [LangGraph persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence).
- [XState pure transition functions](https://stately.ai/docs/pure-transitions).
- [JetStream consumers](https://docs.nats.io/nats-concepts/jetstream/consumers).
- [SLIM session persistence](https://slim.agntcy.org/latest/slim/architecture/sessions/)
  and [experimental A2A binding](https://github.com/a2aproject/experimental-cpb-slimrpc).
- [Archived BeeAI ACP](https://github.com/i-am-bee/acp).

## Limitations and remaining questions

Before implementing the relevant workstream, agree:

1. Which two process definitions test flexibility, and which editor/definition
   format deserves a small demo?
2. Is native Codex behavior required, or is OpenCode's harness with the selected
   models sufficient? Which hosting and authentication profile?
3. What is the smallest transferable progress record, and does LangGraph add
   useful state beyond Temporal and owned records?
4. Which operations are safe interruption points, how long can interruption
   wait, and how do we handle an unknown external result?
5. Which permissions, workspace consistency, and completion rules govern
   handoff and simultaneous contributors to one Task?
6. Does SLIM add enough value over the initial transport? Which external A2A
   capability is needed by the first application?

Multi-tenant production hardening, deployment lifecycle, 10,000-agent
performance, complete visual authoring, and commercial delivery need separate
qualification. Prototype results should improve the long-term design before
those investments.
