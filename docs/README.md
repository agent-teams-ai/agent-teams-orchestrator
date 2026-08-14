---
id: docs.index
type: index
status: active
owner: architecture
summary: Canonical task-oriented map and authority index for all technical documentation.
---

# Technical Documentation

This directory is the canonical architecture knowledge base for Agent Teams
Orchestrator. Navigate by the question you need to answer; do not read the whole
repository by default.

## Five-minute orientation

1. [Architecture overview](architecture/overview.md)
2. [Strategic context map](architecture/context-map.md)
3. [Open decisions](open-decisions/README.md)
4. [Domain documentation](domain/README.md)
5. [Glossary](glossary.md)

Agents should also follow the short repository-level
[navigation and guardrails](../AGENTS.md).

## Navigate by task

| Task | Primary source | Supporting sources |
|---|---|---|
| Understand the system | [Architecture index](architecture/README.md) | [Overview](architecture/overview.md), [quality attributes](architecture/evolution-quality-attributes.md) |
| Model or change a business capability | [Domain index](domain/README.md) | [Context dossiers](domain/contexts/README.md), [Full DDD standard](domain/modeling-standard.md) |
| Add a package or feature | [Feature module standard](architecture/feature-module-standard.md) | [Dependency rules](architecture/dependency-rules.md), [package catalog](../architecture/package-catalog.yaml) |
| Integrate AR or a provider runtime | [Runtime boundary](architecture/runtime-boundary.md) | `OD-004`, [eventing](architecture/eventing-and-reliability.md) |
| Design persistence or concurrency | [Persistence boundary](architecture/persistence-boundary.md) | `OD-003`, [testing](architecture/testing-strategy.md) |
| Add events, feeds, inbox, or outbox | [Eventing and reliability](architecture/eventing-and-reliability.md) | [Public contracts](architecture/public-control-contracts.md) |
| Add client realtime delivery | [SDK and transports](architecture/sdk-and-transports.md) | [ADR-0058](decisions/0058-centrifugo-default-replaceable-client-realtime-edge.md), [Local Host lifecycle](architecture/local-host-lifecycle.md) |
| Classify data or cross a trust boundary | [Security architecture](architecture/security-architecture.md) | [Machine-readable security schemas](../architecture/security/data-classification.schema.json), `OD-012`, `OD-029` |
| Add an SDK or API capability | [SDK and transports](architecture/sdk-and-transports.md) | [Public control contracts](architecture/public-control-contracts.md) |
| Change local lifecycle | [Local Host lifecycle](architecture/local-host-lifecycle.md) | `OD-001`, `OD-021` |
| Migrate legacy behavior | [Migration boundary](architecture/migration-boundary.md) | owning context dossier and migration open decision |
| Change repository tooling | [Repository tooling](architecture/repository-tooling.md) | [Testing strategy](architecture/testing-strategy.md) |
| Change strategic relationships | [Machine-readable architecture model](architecture/architecture-model.md) | [Context map](architecture/context-map.md), owning context dossiers |
| Define SLI, SLO, invariants, or resource budgets | [Reliability objectives](architecture/reliability-objectives.md) | [Testing strategy](architecture/testing-strategy.md), `OD-030` |
| Determine whether production implementation may start | [Implementation readiness gates](architecture/implementation-readiness-gates.md) | [Open decisions](open-decisions/README.md), [Testing strategy](architecture/testing-strategy.md) |
| Record a decision | [Decision index](decisions/README.md) | [ADR template](templates/adr.md), [open-decision index](open-decisions/README.md) |
| Add or reorganize documentation | [Documentation standards](standards/README.md) | `pnpm docs:new -- --help`, [templates](templates/README.md) |
| Inspect experimental evidence | [Research index](research/README.md) | owning ADR or open decision |

## Knowledge map

| Area | Owns | Index |
|---|---|---|
| `architecture/` | Current cross-context structure, boundaries, and quality rules | [Architecture](architecture/README.md) |
| `domain/` | Strategic context dossiers, Ubiquitous Language, invariants, and DDD standards | [Domain](domain/README.md) |
| `decisions/` | Stable architectural rationale and consequences | [ADRs](decisions/README.md) |
| `open-decisions/` | One unresolved or historically resolved design question per file | [Open decisions](open-decisions/README.md) |
| `standards/` | Documentation and repository-wide authoring rules | [Standards](standards/README.md) |
| `templates/` | Required skeletons for governed document types | [Templates](templates/README.md) |
| `research/` | Time-bounded, reproducible evidence; never normative | [Research](research/README.md) |

`operations/`, `migrations/`, and contract reference directories are created only
with their first real document. Empty architecture placeholders are prohibited.

Machine-readable governance:

- [`owners.yaml`](owners.yaml) defines valid documentation responsibility IDs;
- [`metadata.schema.json`](metadata.schema.json) defines document metadata;
- [`architecture/package-catalog.yaml`](../architecture/package-catalog.yaml)
  reserves production package topology.
- [`architecture/likec4/`](../architecture/likec4/model.c4) owns the exact
  strategic relationship graph and security trust-boundary view.
- [`architecture/security/`](../architecture/security/data-classification.schema.json)
  owns machine-readable security classification and fixture schemas.
- [`architecture/reliability/`](../architecture/reliability/reliability-catalog.yaml)
  owns candidate SLIs, strict reliability invariants, and resource budgets.
- [The repository-local docs-authoring Skill](../.agents/skills/docs-authoring/SKILL.md)
  provides the canonical agent workflow without becoming architecture authority.
- `pnpm docs:query`, `pnpm docs:new`, and `pnpm docs:impact` provide the guarded
  find, create, and review-impact path without storing a generated authority.

## Authority and lifecycle

Document type determines authority. ADRs own rationale, architecture documents
own current system rules, context dossiers own domain language and invariants,
machine-readable schemas own exact wire shape, and runbooks own operations.
Research only supplies evidence.

Every document declares machine-validated metadata. An unresolved question stays
in `open-decisions/`; implementation must not choose it silently. A changed
accepted decision gets a new superseding ADR rather than a rewritten history.

See the [documentation standard](standards/documentation.md) for the complete
authority matrix, placement rules, metadata, lifecycle, and review workflow.

## Quality gate

Run:

```bash
pnpm docs:check
pnpm docs:impact
pnpm docs:repository:check
```

CI applies the same metadata, ID, hierarchy, index, navigation, link, anchor,
code-impact, Skill, LikeC4, Mermaid, Markdown, terminology, and spelling checks. Vale enforces only
project-owned terminology rules; CSpell uses the reviewed project dictionary.
External HTTP availability is checked separately because it is nondeterministic.
