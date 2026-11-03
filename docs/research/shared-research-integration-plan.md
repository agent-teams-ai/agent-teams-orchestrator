---
id: research.shared-research-integration
type: research
status: active
owner: integration/runtime
summary: Proposed owner-local follow-through from shared competitor research, preserving accepted decisions and unresolved product policies.
related:
  - ADR-0114
  - ADR-0115
  - OD-024
  - OD-032
---

# Shared Research Integration Plan

## Scope and provenance

Research integration proposal dated 2026-11-03. The planned shared evidence
source is `agent-teams-ai/engineering-research`, `docs/competitors/paperclip.md`.
Publication is pending. This maintained report's `active` status does not accept
its proposed follow-through or change an existing decision.

## Findings and design options

Map research to existing consumption, work eligibility, runtime observations
and authorized-view owners. Preserve ADR-0045's soft limits, hard quotas and
reservation lifecycle; OD-024 owns their unresolved detailed semantics.

## Decision status and qualification

Use [OD-024](../open-decisions/OD-024-usage-accounting-boundaries-and-exact-quantities.md),
[OD-032](../open-decisions/OD-032-last-mile-side-effect-safety.md),
[Consumption Governance](../domain/contexts/consumption-governance/README.md)
and the [runtime boundary](../architecture/runtime-boundary.md).
The existing owner gates remain authoritative.

## Evidence and sources

The proposal maps shared source review into local decisions; it reports no
executed competitor benchmark or new implementation qualification.

## Limitations and remaining questions

Central publication and detailed acceptance mapping remain pending. Historical
reports, exact source pins, accepted ADR bodies and unresolved choices retain
their existing authority.
