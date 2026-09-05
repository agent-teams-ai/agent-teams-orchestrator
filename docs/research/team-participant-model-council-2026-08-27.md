---
id: research.team-participant-model-council-2026-08-27
type: research
status: active
owner: architecture/domain
summary: Independent architecture, product, reliability, and MVP reviews of reusable participants, concurrent Runs, roster overrides, and coordination.
related:
  - ADR-0100
  - ADR-0101
  - domain.contexts.team-topology
  - OD-006
  - OD-011
  - OD-044
  - OD-045
  - OD-046
  - OD-047
  - research.team-creation-legacy-capability-inventory-2026-08-27
---

# Team Participant Model Council, 2026-08-27

## Question

What participant and Team model best supports reusable agents, concurrent Runs,
per-Run roster changes, and replaceable coordination without overbuilding the
first `CheckTeamDraft` module pilot?

## Method

Sixteen independent hosted workers reviewed four questions. Each question had a
DDD, product UX, reliability/security, and MVP-simplicity reviewer. Workers used
`gpt-5.6-sol` with `xhigh` reasoning and fast service tier. They were read-only,
made no repository changes, and did not launch agents, runtimes, terminals, or
provisioning flows.

Thirteen reports independently read the canonical architecture snapshot. Three
reports produced useful supporting opinions but could not re-read it because
their lane lacked a non-terminal file reader. The controller therefore checked
every recommendation against current Orchestrator
`main@81e6946bd4161b30e456965f09bcb7969ecd3cbb` and the legacy Desktop
`main@f6afac73cced62d943a0e891ad08d7b8f88f802f` before recording the open
decisions.

## Product-owner resolution after the council

The council remains useful evidence, but it is not normative authority. On
2026-08-27 the product owner accepted the versioned Agent model and immutable
Run overlay, then deliberately selected a simpler identity rule than the
concurrent-reuse recommendation:

- one Agent has at most one current Team assignment;
- one Agent has at most one active Run occupancy;
- a similar concurrent participant is an explicit copy with a new Agent identity
  and separate statistics;
- a saved Team edit and a change for only one Run are separate actions;
- a Team may define one ordinary default coordinator and a Run may replace it.

ADR-0100 and ADR-0101 are the current authority. The council's concurrent-use
section below records the alternatives considered, not the selected design.

## Results

`🎯` is confidence in the recommendation, `🛡️` is reliability, and `🧠` is
implementation complexity where ten is harder. LOC estimates include core,
tests, and relevant handwritten API mapping, but exclude generated code and UI;
scope differences make them order-of-magnitude estimates.

### Reusable participant identity

All four reviewers selected a versioned `AgentProfile` owned by Team Topology.
A Team member has its own identity and references an exact profile version. An
inline definition may be saved through a separate `Save and link` action.

| Option | Assessment | Approximate LOC |
|---|---|---:|
| Versioned `AgentProfile` plus exact profile-version reference | 🎯 9/10 · 🛡️ 9/10 · 🧠 6/10 | 900–1,700 |
| Live reference that always follows the latest profile | 🎯 5/10 · 🛡️ 5/10 · 🧠 3/10 | 350–1,100 |
| Saved template copied inline into each Team | 🎯 5/10 · 🛡️ 7/10 · 🧠 3/10 | 300–1,000 |

The exact-reference model preserves both reusable identity and immutable Team
behavior. The copy model is a valid explicit `Fork profile` action, not the
default meaning of reuse.

### Concurrent use

All four reviewers selected one logical profile with independent membership and
Run instances. Two reports independently verified the full canonical snapshot;
two reached the same recommendation without that re-read.

| Option | Assessment | Approximate LOC |
|---|---|---:|
| Shared profile plus isolated Run participant, binding, session, context, and workspace | 🎯 9/10 · 🛡️ 9/10 · 🧠 5/10 | 700–1,600 |
| Clone the profile for every Team | 🎯 6/10 · 🛡️ 7/10 · 🧠 7/10 | 850–2,200 |
| Exclusive one-active-Run lease per profile | 🎯 3/10 · 🛡️ 5/10 · 🧠 8/10 | 1,200–1,800+ |

The profile is shared configuration, never a singleton live agent. Every Run
gets separate runtime and cancellation authority. Exclusivity remains a possible
future capacity policy for a provider limitation, not a Team invariant.

### Per-Run roster changes

All four reviewers selected an immutable source Team version, typed Run-only
overlay, and fully materialized effective roster in `RunPlanVersion`.

| Option | Assessment | Approximate LOC |
|---|---|---:|
| Source Team version plus typed overlay plus effective Run snapshot | 🎯 9/10 · 🛡️ 9/10 · 🧠 6/10 | 1,200–1,800 |
| Effective snapshot without normalized override provenance | 🎯 7/10 · 🛡️ 8/10 · 🧠 4/10 | 650–1,300 |
| Overlay only, recalculated later | 🎯 6/10 · 🛡️ 6/10 · 🧠 7/10 | 700–2,500 |

The effective snapshot is execution authority. The overlay exists for diff,
audit, exact re-run explanation, and optional later save-back. Starting a Run
never mutates or silently forks the saved Team.

### Coordinator and hierarchy

This was the only genuine disagreement. Three reviewers selected Team-stored
eligibility/default intent plus a Run-specific coordinator assignment. The MVP
reviewer preferred a coordinator role stored directly in `TeamVersion` and
pinned by the Run.

| Option | Assessment | Approximate LOC |
|---|---|---:|
| Team eligibility/default plus Run-specific assignment to an ordinary participant | 🎯 9/10 · 🛡️ 9/10 · 🧠 6/10 | 1,200–1,800 |
| Coordinator role fixed in each Team version and inherited by the Run | 🎯 7/10 · 🛡️ 8/10 · 🧠 4/10 | 900–1,300 |
| Permanent `Team.leadId` or participant hierarchy | 🎯 3/10 · 🛡️ 4/10 · 🧠 3/10 | 450–900 initially |

The leading hybrid fits the requested UX: a saved Team may suggest a default,
while a specific Run may omit or replace that participant without rewriting the
Team. In every model the coordinator remains an ordinary participant. A role
label does not grant security authority, read private messages, or bypass Work
Coordination.

## First-slice consequence

The council did not justify putting the full future model into the module pilot.
The accepted first classifier remains deliberately narrow:

- one pure `CheckTeamDraft` application capability;
- one optional opaque `roleKey` per member;
- deterministic typed diagnostics;
- no persistence, profile creation, DB, AR, execution, hierarchy, generic policy
  engine, or GraphQL;
- then a separate SDK/Protobuf/Connect increment over the same behavior.

The checker must preserve explicit extension seams and must not claim that
structure validation proves profile existence, authorization, runtime capacity,
or launch readiness.

## Limitations

- The council produced architecture evidence, not product-owner acceptance.
- LOC ranges vary because the underlying Team package and exact public contract
  do not yet exist.
- OD-006 and OD-011 still own aggregate validation and context acceptance.
- Conversation history, shared memory, credential binding, usage attribution,
  retention, and mid-Run replacement require their owning decisions before
  implementation.
