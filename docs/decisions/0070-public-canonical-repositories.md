---
id: ADR-0070
type: adr
status: accepted
owner: architecture/governance
summary: Publish the orchestrator and agent runtime from one public canonical repository each.
approved_by: product-owner
accepted_at: 2026-07-31
related:
  - ADR-0003
  - ADR-0024
  - ADR-0055
  - ADR-0069
  - architecture.runtime-boundary
---

# ADR-0070: Public Canonical Repositories

## Context

The orchestrator and agent runtime were initially discussed as private projects.
Public repositories now match the intended distribution model, but duplicate
private repositories would make contribution history, releases, security policy,
and the canonical Runtime Published Language ambiguous.

Repository visibility must not weaken the architectural boundary between the
orchestrator control plane and AR execution runtime.

## Decision

Use exactly these public canonical source repositories:

- `agent-teams-ai/agent-teams-orchestrator` for the orchestrator;
- `agent-teams-ai/agent-runtime` for AR.

Both repositories use their checked-in Apache-2.0 license. A private fork or
mirror may exist for temporary development, but it is never a release authority,
contract authority, canonical issue tracker, or documented dependency.

Repository URLs are distribution metadata. The Runtime Published Language,
consumer-owned ports, anti-corruption layer, and versioned package contracts
remain the only integration authorities. Neither repository imports the other
system's domain model or source internals.

Public source must not contain production credentials, provider accounts,
workspace content, prompts, private runtime fences, user artifacts, or test data
from real projects. Secret scanning, dependency review, classification manifests,
and release provenance remain mandatory.

## Consequences

- Contributors and SDK consumers have one discoverable source and issue history
  for each system.
- Releases cannot silently originate from an undocumented private repository.
- Public visibility increases the importance of deterministic security and
  provenance gates without changing domain ownership.
- Repository moves require a successor ADR and redirects, but contract evolution
  continues through normal versioning rather than repository coupling.

## Rejected alternatives

- Keep a private repository as the hidden canonical source behind a public mirror.
- Treat both public and private repositories as equal release authorities.
- Merge AR provider execution into the orchestrator because both are public.
- Use repository imports in place of the Runtime Published Language.
