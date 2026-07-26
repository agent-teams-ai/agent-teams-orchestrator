---
id: ADR-0034
type: adr
status: accepted
owner: architecture/governance
summary: Require explicit product-owner approval metadata before a new ADR becomes accepted.
approved_by: product-owner
accepted_at: 2026-07-25
related:
  - template.adr
  - standard.documentation
---

# ADR-0034: Explicit Product-Owner Approval for Accepted ADRs

## Context

Architecture decisions are discussed across parallel agent sessions. An agent can
prepare a sound proposal, but it cannot infer that discussion in another session
constitutes approval. Marking a disputed proposal as accepted creates conflicting
sources of truth.

The repository needs a lightweight, machine-checked distinction between proposing
a decision and recording the product owner's explicit instruction to accept it.
The check cannot and should not attempt to parse private chat history.

## Decision

Every new ADR starts with `status: proposed`. After explicit product-owner
confirmation to record the decision, the responsible agent may set
`status: accepted` and must add:

```yaml
approved_by: product-owner
accepted_at: YYYY-MM-DD
```

The same approval metadata remains when such an ADR later becomes `superseded`.
Proposed ADRs must not contain approval metadata. Approval fields are ADR-only and
never appear on architecture documents, context dossiers, contracts, runbooks, or
open decisions.

Documentation validation enforces the policy for ADR-0034 and later. Earlier ADRs
remain grandfathered because reconstructing approval metadata would create false
history.

The metadata records an explicit approval assertion. It does not authenticate a
person or prove a conversation. Repository governance may later require protected
pull-request approval without changing ADR ownership semantics.

## Consequences

- Agents can safely prepare complete ADR proposals in parallel.
- Accepted decisions visibly differ from unapproved recommendations.
- CI rejects a new accepted ADR with missing approval metadata.
- Human coordination remains necessary because metadata cannot verify chat
  history.
- Historical ADRs remain honest but do not gain retroactive approval metadata.

## Rejected alternatives

- Let any agent infer acceptance from surrounding discussion.
- Add approval metadata to every documentation type.
- Fabricate approval dates for historical ADRs.
- Parse chat transcripts in repository tooling.
