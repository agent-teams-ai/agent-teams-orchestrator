---
id: ADR-0023
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: platform/control-api
summary: Paginate every unbounded collection from v1 with opaque scope-bound keyset tokens.
related:
  - ADR-0015
  - ADR-0016
  - OD-016
  - OD-019
---

# ADR-0023: Pagination Contracts from v1

## Context

Adding pagination after publishing an unbounded list changes response types and
client control flow. Offset pagination also becomes unstable and expensive as
mutable collections grow.

Different use cases need different consistency: ordinary UI browsing can tolerate
a live keyset view, while bootstrap and reconciliation require a stable snapshot
watermark.

## Decision

Every potentially unbounded public collection is paginated in v1. Requests carry
an optional bounded page size and opaque page token. Responses carry one page and
an optional next-page token.

A token is integrity-protected and bound to:

- tenant and project scope;
- stable authenticated subject and authorization context;
- filter and sort;
- deterministic tie-breaker;
- consistency mode and snapshot watermark when applicable;
- expiry.

Changing scope, filter, sort, or consistency while reusing a token is an invalid
page-token outcome. Authorization is evaluated again for every page. Page size may
change within documented limits.

Offset pagination is not used. Every collection declares a deterministic keyset
order. Ordinary list operations declare live keyset consistency and document that
concurrent mutation may move unseen items. Bootstrap and reconciliation operations
use snapshot-consistent pagination and preserve one watermark across all pages.

SDKs provide an asynchronous item iterator and an explicit page iterator. They do
not expose a convenience method that materializes an unbounded collection into one
array.

## Consequences

- Collection APIs can scale without a later response-shape break.
- Tokens become security-sensitive server state or signed capability data.
- Snapshot-consistent listing requires retention and expiry policy.
- Callers choose between item iteration and page-level control.

## Rejected alternatives

- Return arrays and add pagination when data grows.
- Use numeric offsets.
- Allow tokens to be replayed with different filters, scope, or principals.
- Promise snapshot consistency for every ordinary UI list.

## Evidence

- [Google AIP-158: Pagination](https://google.aip.dev/158)
- [Azure SDK paging guidance](https://azure.github.io/azure-sdk/general_design.html)
