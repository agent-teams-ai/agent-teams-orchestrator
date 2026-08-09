---
id: ADR-0073
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture/domain
summary: Establish Agent Context as a separate bounded context with a minimal provider-neutral first slice.
approved_by: product-owner
accepted_at: 2026-08-01
related:
  - ADR-0068
  - domain.contexts.agent-context
  - OD-028
  - OD-033
---

# ADR-0073: Separate Agent Context Bounded Context

## Context

The legacy desktop flow turned one large startup prompt into an implicit wire
protocol. Work facts, identity, instructions, policy, tool descriptions, provider
formatting, and resume behavior were assembled without one semantic owner. That
made context expensive to evolve and allowed prompt construction to absorb Run,
runtime, and source responsibilities.

Run Orchestration, Agent Attention, source contexts, and AR each own different
decisions. Keeping semantic context composition inside any one of them would
either create a god component or make provider mechanics authoritative for
product meaning.

## Decision

Create a separate Agent Context bounded context inside the modular monolith.
Reserve `context.agent-context` and `@agent-teams/agent-context` in the package
catalog now. Do not materialize the package until its proposed dossier passes the
Full DDD and Gate 2 evidence requirements.

Agent Context owns:

- purpose-relative selection and composition of disclosed contributions;
- provenance, source basis, precedence, conflict, omission, and freshness rules;
- immutable provider-neutral context manifests and contract snapshots;
- semantic validity, invalidation, successor planning, and materialization
  evidence intake;
- provider-neutral continuity evidence and explicit loss reporting.

It does not own source facts, authorization, risk policy, money or quota,
attention priority, Run activation, runtime lifecycle, provider formatting,
tokenization, native cache, compaction, connectors, credentials, or webhooks.

The minimum first slice is deliberately narrow:

1. identity and role contribution;
2. one Work snapshot contribution;
3. one managed instruction module;
4. one immutable manifest with provenance and required-content handling;
5. one typed AR context-application outcome consumed through the Runtime ACL.

Agent Context publishes evidence. Run Orchestration alone decides whether and
when a runtime generation is activated, woken, paused, or replaced. AR alone
decides how accepted semantic content is materialized for a provider. Hard
invariants remain executable application/domain rules and never depend on model
obedience.

Full OODA convergence, Conversation contributions, RAG or vector storage,
external connectors, generalized memory, speculative branch graphs, and public
manifest internals are outside the minimum slice. Their later addition must
preserve this ownership boundary.

## Consequences

- Context composition can evolve without coupling Run state to provider prompt
  mechanics.
- The first implementation is larger than another prompt builder, but avoids a
  temporary owner that would require a later data and contract migration.
- The strategic boundary is accepted while exact aggregates and feature slices
  remain proposed until scenario evidence is complete.
- Source contexts publish facts once; Agent Context consumes them through its own
  ACLs and never imports their aggregates or repositories.

## Rejected alternatives

- Keep Agent Context as a Run Orchestration feature and extract it later.
- Let AR own semantic context and product provenance.
- Materialize a complete OODA, RAG, memory, and connector platform in the first
  slice.
