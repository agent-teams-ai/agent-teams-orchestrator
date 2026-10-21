---
id: template.package-index
type: template
status: active
owner: architecture
summary: Governed navigation for a declared package and its materialized feature documentation.
---

# Package Index Template

Use the declared package identity and registered owner. Link the canonical owner
authority and actual feature documentation; keep domain decisions in that owner.
The writer resolves `package.contexts.example` only to
`packages/contexts/example/README.md`. It does not authorize a new package.

```markdown
---
id: package.contexts.example
type: index
status: active
owner: architecture
summary: Navigation for a declared package and its materialized feature documentation.
---

# Package Name

## Features
```

Add each real feature link before running the repository documentation gate.
Application indices are outside this packages-only authoring rule.
