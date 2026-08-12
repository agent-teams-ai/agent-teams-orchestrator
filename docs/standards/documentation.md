---
id: standard.documentation
type: architecture
status: accepted
owner: architecture
summary: Canonical metadata, ownership, placement, and validation rules for project documentation.
related:
  - ADR-0053
  - architecture.index
  - domain.contexts.index
code_anchors:
  - pattern: scripts/docs/**
    enforcement: advisory
  - pattern: scripts/skills/**
    enforcement: advisory
  - pattern: .vale/**
    enforcement: advisory
  - pattern: .cspell/**
    enforcement: advisory
  - pattern: .cspell.json
    enforcement: advisory
---

# Documentation Standard

## Purpose

Documentation is part of the architecture contract. It must remain navigable,
owned, non-duplicative, and machine-verifiable as the repository grows.

## Information architecture

Organize documents by the question they answer, not by author, sprint, or frontend:

| Intent | Question | Artifact |
|---|---|---|
| Orientation | Where should I start for this task? | Repository and directory indexes |
| Explanation | What architecture or domain model applies now? | Architecture documents and context dossiers |
| Decision | Why was this significant choice made? | ADR |
| Uncertainty | What choice is still unresolved? | Open decision |
| Reference | What is the exact contract, term, or supported surface? | Machine-readable schema, contract document, glossary |
| Procedure | How is a real operation, migration, or recovery executed? | Runbook or migration program |
| Evidence | What experiment or external fact informed a choice? | Time-bounded research report |

One document has one primary intent and one authority. A document may link to
other intents, but it must not redefine them.

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

Every non-template owner is registered in
[`docs/owners.yaml`](../owners.yaml). The registry prevents spelling drift; it
does not define organizational reporting or accept a bounded context.

Optional relationship fields use document IDs, not paths:

- `related`;
- `blocked_by`;
- `supersedes`;
- `superseded_by`.

Optional `code_anchors` connect a governed document to implementation or
machine-readable sources whose changes require documentation review:

```yaml
code_anchors:
  - pattern: scripts/docs/**
    enforcement: advisory
  - pattern: packages/contexts/example/src/features/example/**
    enforcement: required
```

Patterns are repository-relative, use forward slashes, cannot escape the
repository, and must match at least one current file. They cannot target `docs/**`
or `.agents/**`; documentation relationships use stable IDs and links instead.

`advisory` reports impact without blocking. `required` fails
`pnpm docs:impact -- --strict` when matching source changed but the owning
document did not. Start broad relationships as advisory and promote only after a
measured false-positive baseline.

`blocked_by` names open decisions that prevent the proposed artifact from becoming
accepted. Every blocker also appears in `related`. Accepted artifacts cannot
retain an open blocker.

Resolved open decisions also require `resolved_by` with exactly one deciding ADR.
That field is forbidden while the decision is `open` or `deferred`; supporting
ADRs may still appear in `related`.

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
| `architecture`, `domain-standard`, `bounded-context`, `feature`, `contract` | `accepted`, `proposed`, `exploratory`, `deprecated`, `superseded` |
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

Split documents by ownership, authority, lifecycle, or reader task, not merely by
line count. A long cohesive boundary is safer than several overlapping partial
sources. When a document is split, leave one indexed primary entry point and move
content rather than copying it.

## Domain documentation and colocation

Before a bounded-context package exists, its strategic dossier lives under
`docs/domain/contexts/<context>/`. After implementation starts:

- the root dossier remains the strategic index and context relationship map;
- detailed feature behavior is colocated with
  `packages/contexts/<context>/src/features/<feature>/`;
- package-level public surfaces are documented beside the package;
- the dossier links to those sources instead of copying them.

Package-root and `src/features/**/README.md` documents are governed by the same
metadata, links, title, and reachability checks as `docs/**`. A package index uses
`type: index`; a feature document uses `type: feature`. The owning strategic
dossier links the package index before production code is accepted.

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

Use the [template index](../templates/README.md) to select the governed skeleton.
Templates define required evidence and headings; they do not authorize invented
domain detail.

## Navigation

Every document must be reachable from [the documentation index](../README.md)
through Markdown links. Every documentation directory has a `README.md`: a
collection index for multiple entries or the governed dossier for one leaf
artifact. Agents should not need directory scans to discover canonical guidance.

Each directory index directly links:

- every Markdown document immediately inside that directory;
- the `README.md` of every immediate child directory containing documentation.

Transitive reachability alone is insufficient. Direct links make ownership and
placement visible at the boundary where a contributor adds a file.

Repository and directory indexes route readers; they do not repeat normative
rules. Use task-oriented links and short scope descriptions. Stable document IDs
are preferred in discussion and automation because paths may move.

Use
`pnpm docs:query -- --id|--owner|--type|--status|--related|--blocked-by <value>`
for metadata-backed discovery. It derives results from frontmatter and never
writes a generated source-of-truth file.

The Foundation read-only catalog is currently adopted in shadow mode through
`pnpm docs:query:shadow`. The required documentation gate compares its complete
common projection with `docs:query` by stable ID and path; any partial catalog or
content mismatch fails the gate. Common AND-filter and zero-result probes also
preserve the query migration contract. Ordering stays engine-specific during shadow:
the legacy query retains its frozen locale ordering while Foundation uses its
portable binary order. Agents continue to use `docs:query`, and `docs:new`
remains the only supported automated writer during this migration phase. The
Foundation shadow does not write documents or generated indexes.

## AI-assisted authoring

An agent changing documentation starts with the canonical repository-local
[docs-authoring Skill](../../.agents/skills/docs-authoring/SKILL.md). The Skill is
workflow guidance, not another architecture authority.

The agent must:

1. start from the nearest directory index and the task route in `docs/README.md`;
2. identify the authoritative artifact type before writing;
3. search stable IDs, related metadata, and supersession links;
4. update the existing authority instead of creating a parallel explanation;
5. preserve unresolved choices as open decisions;
6. use `pnpm docs:new -- --help` for a new governed artifact so the matching
   template, identity, owner, placement, relationships, and code anchors are
   validated before the first write;
7. run `pnpm docs:impact` to inspect code-anchored documents;
8. run `pnpm docs:check`.

`docs:new` never overwrites a file, accepts an unregistered owner, records an
accepted decision, or edits semantic index prose. Its output is incomplete until
the author fills the evidence sections and links it from the nearest index.

Generated summaries, semantic indexes, search databases, and AI-produced diagrams
are disposable derived views. They never become a source of truth unless reviewed
and committed as a governed document with an owner and lifecycle.

The Skill itself is machine-validated for naming, metadata, size, local links,
and UI metadata. Do not copy it into product-specific agent directories. Agent
surfaces should discover the canonical `.agents/skills/` location or use a thin
generated pointer.

## Change consistency

Update related artifacts in one change when their authority requires it:

| Change | Required documentation |
|---|---|
| Significant accepted design choice | New or superseding ADR plus current architecture update |
| New unresolved architecture choice | One open-decision record and links from affected current documents |
| New or changed context boundary | Context map, owning dossier, package catalog reservation when applicable, and ADR |
| New public contract capability | Machine-readable schema, semantic contract documentation, fixtures, and compatibility notes |
| New operational failure mode | Runbook, observability links, and tested recovery evidence |
| New feature behavior | Colocated feature documentation plus root dossier links when strategically relevant |

## Validation

`pnpm docs:check` is the local and CI quality gate. It validates:

- YAML frontmatter against `docs/metadata.schema.json`;
- unique document IDs and filename conventions;
- exactly one top-level title per Markdown document;
- local links and anchors;
- navigation reachability;
- direct directory-index completeness;
- ADR lifecycle placement and metadata-backed collection indexes;
- status-sensitive required document sections;
- safe, non-stale code anchors and changed-path impact reporting;
- guarded creation from the current governed templates, covered by positive and
  negative fixture tests;
- Mermaid syntax using the official Mermaid parser;
- Markdown structure;
- canonical product and technology terminology through project-owned Vale rules;
- spelling through a reviewed CSpell project dictionary.
- repository-local Skill structure and fixture tests;
- LikeC4 relationship-model consistency with the package catalog.

The validator itself has positive and negative fixture tests. External HTTP
availability is checked by a scheduled Lychee workflow, not by the deterministic
per-change gate; transient network failures must not block every pull request.

Vale is intentionally restricted to deterministic terminology rules under
`.vale/styles/AgentTeams/`. Do not add a general-purpose prose style pack without
an ADR and a measured false-positive baseline.

CSpell checks governed English documentation. Valid domain terms are added once
to `.cspell/project-words.txt` after review, never scattered across inline ignore
comments. Suspected typos are corrected rather than allowlisted. The project
configuration and dictionary are authoritative for local checks and CI.
