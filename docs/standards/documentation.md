---
id: standard.documentation
type: architecture
status: accepted
owner: architecture
summary: Canonical metadata, ownership, placement, and validation rules for project documentation.
related:
  - architecture.index
  - domain.contexts.index
---

# Documentation Standard

## Purpose

Documentation is part of the architecture contract. It must remain navigable,
owned, non-duplicative, and machine-verifiable as the repository grows.

## Authority by knowledge type

There is no global precedence order between unrelated artifact types. Authority is
selected by the question being answered:

| Question | Authoritative artifact |
|---|---|
| Why was a significant decision made? | Accepted ADR |
| What system-wide architecture rule applies now? | Architecture document |
| What does a domain term or invariant mean? | Owning bounded-context dossier and domain model |
| What is the exact wire shape? | Owning machine-readable contract schema |
| How is a feature implemented locally? | Colocated feature documentation and code |
| How is the system operated or recovered? | Current runbook |
| What practical evidence supports a decision? | Time-bounded research report |
| What remains unresolved? | Open-decision document |

An ADR does not override an exact contract schema, and a schema does not explain
architecture rationale. When artifacts disagree within the same knowledge type,
the conflict must be resolved explicitly rather than hidden behind this table.

## Required frontmatter

Every Markdown file under `docs/` starts with YAML frontmatter:

```yaml
---
id: architecture.runtime-boundary
type: architecture
status: accepted
owner: integration/runtime
summary: Ownership and contract boundary between the orchestrator and ar.
related:
  - ADR-0028
  - OD-004
---
```

Required fields:

- `id`: stable repository-wide identifier; never reused;
- `type`: one of the types declared by `docs/metadata.schema.json`;
- `status`: a type-compatible lifecycle status;
- `owner`: a capability, bounded context, or architecture area, never a person;
- `summary`: one sentence describing the document's authority.

Optional relationship fields use document IDs, not paths:

- `related`;
- `supersedes`;
- `superseded_by`.

Accepted and superseded ADRs governed by ADR-0034 also require:

- `approved_by`: the approving role, currently `product-owner`;
- `accepted_at`: the explicit approval date in `YYYY-MM-DD` form.

These fields belong only to ADRs. Proposed ADRs never carry approval metadata.
ADRs 0001 through 0033 predate this policy and remain grandfathered without
invented approval history.

Paths may change; IDs remain stable. Renaming a document does not change its ID.

## Status rules

| Document type | Allowed statuses |
|---|---|
| `architecture`, `domain-standard`, `bounded-context`, `contract` | `accepted`, `proposed`, `exploratory`, `deprecated`, `superseded` |
| `adr` | `proposed`, `accepted`, `superseded` |
| `open-decision` | `open`, `deferred`, `resolved` |
| `index`, `template`, `glossary`, `runbook`, `research` | `active`, `deprecated` |

Do not combine multiple statuses in prose such as `accepted but partly open`.
Record accepted scope in the document and link every unresolved part to an
open-decision ID.

## Placement

```text
docs/
  architecture/       current cross-context architecture
  decisions/          stable ADR files and index
  open-decisions/     one unresolved decision per file
  domain/
    contexts/         one strategic dossier per proposed or accepted BC
  standards/          documentation and repository-wide authoring standards
  templates/          required document skeletons
  operations/         runbooks, created when real operations exist
  migrations/         migration programs and compatibility plans
  research/           time-bounded evidence, never normative
```

Research records exact versions, environment, method, results, evidence location,
and limitations. It never becomes the authority for current architecture,
contracts, domain language, or operations. Accepted conclusions are copied into
their owning ADR, architecture document, bounded-context dossier, or open
decision; the research report links to those sources instead of redefining them.

Do not create empty directories. The last three directories are created only with
their first real document.

## Domain documentation and colocation

Before a bounded-context package exists, its strategic dossier lives under
`docs/domain/contexts/<context>/`. After implementation starts:

- the root dossier remains the strategic index and context relationship map;
- detailed feature behavior is colocated with
  `packages/contexts/<context>/src/features/<feature>/`;
- package-level public surfaces are documented beside the package;
- the dossier links to those sources instead of copying them.

Global `docs/glossary.md` contains only cross-system terms. Context-specific
Ubiquitous Language belongs in the owning context dossier.

## Decision records

- ADR filenames and IDs are permanent.
- New ADRs start as `proposed`. An agent changes one to `accepted` only after an
  explicit product-owner instruction to record the decision.
- ADR approval metadata records that confirmation; it does not attempt to parse or
  prove a chat transcript.
- Accepted ADR text changes only for typo or link corrections.
- A changed decision creates a new ADR and `supersedes` relationship.
- Open decisions use one file per question and become `resolved` with a link to
  the deciding ADR.
- Do not delete historical ADRs or resolved decision records.

## Templates

- [ADR](../templates/adr.md)
- [Bounded-context dossier](../templates/bounded-context.md)
- [Contract documentation](../templates/contract.md)
- [Open decision](../templates/open-decision.md)
- [Runbook](../templates/runbook.md)

## Navigation

Every document must be reachable from [the documentation index](../README.md)
through Markdown links. Every directory containing multiple documents has a
`README.md` index. Agents should not need directory scans to discover canonical
guidance.

## Validation

`pnpm docs:check` is the local and CI quality gate. It validates:

- YAML frontmatter against `docs/metadata.schema.json`;
- unique document IDs and filename conventions;
- local links and anchors;
- navigation reachability;
- ADR, open-decision, and context index completeness;
- Mermaid syntax using the official Mermaid parser;
- Markdown structure and style.

External HTTP availability is not checked in this deterministic gate.
