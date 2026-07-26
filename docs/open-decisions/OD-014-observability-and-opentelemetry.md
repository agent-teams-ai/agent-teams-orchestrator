---
id: OD-014
type: open-decision
status: open
owner: platform/observability
summary: Define OpenTelemetry conventions, privacy, export, sampling, and retention.
related:
  - architecture.eventing
  - architecture.extensions
---

# OD-014: Observability and OpenTelemetry

## Decision required

Choose semantic conventions, metrics, tracing, logs, sampling, exporters,
retention, correlation propagation, and the safe fingerprint policy for rejected
or quarantined transport messages.

## Constraints

Provider prompts, credentials, attachments, workspace content, and authority
evidence are private by default. Redaction rules must be testable before export.
An unkeyed digest of secret-bearing raw content is not an acceptable substitute
for redaction. Rejection correlation must choose explicitly between transport
identity only, a fingerprint of approved redacted canonical metadata, and a
versioned keyed digest with key-rotation and retention rules.

Telemetry is not durable causality or authority:

- `eventId`, `correlationId`, `causationId`, command receipts, inbox state,
  revisions, fences, and workflow attempts remain application data;
- `traceparent` is optional observability metadata and never an idempotency,
  ordering, authorization, or recovery input;
- malformed trace context is ignored and cannot reject a business command;
- synchronous request/application/database work may use parent-child spans;
- delayed outbox, redelivery, replay, and workflow attempts use bounded new-root
  spans with links to their causal observation;
- every publish, delivery, and activity retry is a distinct attempt span.

OpenTelemetry also has two separate product roles. Platform observability owns
traces, metrics, logs, exporters, and operational correlation. A usage-owning
bounded context may expose feature-owned OpenTelemetry ingestion or export
adapters. Those adapters translate into the context's Published Language and do
not make sampled telemetry authoritative accounting evidence. OD-024 owns the
usage-specific identity, precision, deduplication, and correction rules.

Public inbound baggage is not propagated by default. Resource attributes contain
service and deployment identity only. Tenant, project, workspace, command, event,
task, run, and agent IDs may be allowlisted trace or log attributes for lookup but
never default metric labels. Prompts, credentials, attachments, raw provider
payloads, and authority evidence are absent from all signals by default.

## Decision evidence

An isolated Connect to database/outbox to JetStream/inbox to durable-workflow
matrix ran twice through a real OpenTelemetry Collector. Seventy of 72 checks
passed with stable OpenTelemetry API 1.9.1, trace/metrics SDK 2.10.0, experimental
Node/OTLP/log packages 0.221.0, semantic conventions 1.43.0, and Collector 0.157.0.

The two repeated failures are one explicit negative result: metric exemplars were
not exported by the exact stable JavaScript metrics SDK. Exemplar support is
therefore unproven and must not become a release requirement or custom
application mechanism until the upstream pipeline supports it and a replacement
conformance test passes.

The matrix proved:

- publish unknown-outcome recovery with the same event identity;
- consumer crash after durable commit and safe redelivery deduplication;
- independent spans and links for delayed publish, delivery, and workflow retry;
- sampled, unsampled, and malformed inbound trace-context behavior;
- structured OTLP logs with trace correlation;
- telemetry outage and process restart without changed business effects;
- explicit attribute allowlists, no untrusted baggage, and bounded metric series.

Production Collector HA and persistent queues, backend retention and tail
sampling, tenant-aware exporter authorization, long-outage memory pressure,
browser trust boundaries, real Temporal interceptors, TLS rotation, and legal
deletion remain open.

## Resolution

Open.
