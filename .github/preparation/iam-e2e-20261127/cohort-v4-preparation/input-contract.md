# Orchestrator v4 initial candidate: prerequisites and capture contract

This task-local generator is unexecuted. It prepares only `PUBLISHED_UNQUALIFIED` and writes three proposed repository files. It performs no network call, remote mutation, package installation, qualification, desired-policy edit or consumer transition. Supplied GitHub JSON captures are not independent network observations by this tool.

## Actual merge gate

Wait for ordinary PR467 merge and actual Node26/Node24 main CI success. The generator requires the actual merge commit `M`, its sole parent `d167b2360524474240a43e3ff70e35eb94e109c7`, exact tree `31561be538b5dc4b4aa02e53278047d79ff4dbaa`, the unchanged workflow blob `714af12998ef140dd55a2ec3057f67775586cfd7`, and corrected receipt blob `15090b6ce1ca77f3591f3337137d564b4c82dc87`. Main must still equal M. If it moves, stop and revalidate the new situation; do not alter a supplied observation to pretend the old snapshot is current.

Create a clean, detached checkout of actual M with the existing compatible dependencies. The source imports M's unmodified native registry/schema/digest/rendering validators. It verifies the local Git tree and sole parent against the approved repair, verifies the supplied retained files against `git show HEAD:<path>`, and preserves every existing registry record and event.

## Input descriptor

The input JSON contains `schemaVersion: 1`, `target: "docs-2026-11-27-orchestrator-v4"`, a genuine capture timestamp `observedAt`, canonical absolute `centralRoot`, and `files`. The capture timestamp must be at or after the supplied merge, native run updates and job completion times, and no later than the actual preparation time. Every file descriptor is `{path, sha256, bytes?}` with a canonical absolute regular-file path and `sha256:<hex>`. Symlinks, changed hashes, inputs over8MiB, missing captures, incomplete CI censuses and non-successful current attempts refuse preparation.

The `files` mapping has exactly these keys:

| Key | Required genuine bytes |
| --- | --- |
| `registry` | M's `governance/docs-qualified-cohorts.json` |
| `candidate` | M's retained v3 `candidate-input.json`, digest235e0dbe… |
| `publication` | M's retained v3 `publication.json`, digestc0ea6427… |
| `closure` | Existing `governance/docs-runtime-closures/sha256-7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475.json` |
| `callerTemplate` | Actual published adapter0.8.0 `assets/docs-protocol.yml`, SHA2561d442468… |
| `workflow` | M's `.github/workflows/docs-protocol-check.yml` |
| `receiptImplementation` | M's corrected `scripts/verify-docs-cohort-v2-receipt.mjs` |
| `mergedPull` | Actual GET `/repos/agent-teams-ai/.github/pulls/467` after merge |
| `mainBranch` | Fresh actual GET `/repos/agent-teams-ai/.github/branches/main` |
| `mergeCommit` | Actual GET `/repos/agent-teams-ai/.github/git/commits/M` |
| `mergeTree` | Actual complete GET `/repos/agent-teams-ai/.github/git/trees/31561be538b5dc4b4aa02e53278047d79ff4dbaa?recursive=1` |
| `node26Run` | Latest run observation for M's push/main `.github/workflows/ci.yml` |
| `node26Jobs` | Complete jobs response for that run's actual latest attempt |
| `node24Run` | Latest run observation for M's push/main `.github/workflows/node24-compatibility.yml` |
| `node24Jobs` | Complete jobs response for that run's actual latest attempt |
| `checks` | Complete commit check-runs response for M, including both genuine job/check IDs and App15368 |

No input is prefilled with a future commit, run ID, timestamp or success. Parent must independently read the actual remote observations and verify their provenance before supplying them. The generator checks internal consistency; it cannot authenticate locally fabricated API JSON.

Invocation, only after all genuine inputs exist:

`node prepare-orchestrator-v4.mjs /absolute/input.json sha256:<actual-input-hash> /absolute/fresh-output`

The output parent must already exist and be canonical. Output must be absent and disjoint from the native checkout and input files. A failure after creating output leaves a diagnostic partial directory; never reuse it as success.

## Retained inputs and new proposal

Retain the exact immutable f61 v3 package coordinates, SRIs, provenance, policy3.1.0, published assets, and actual88-package closure7957. Keep `upgrade_from` and `rollback_to` exactly `["docs-2026-10-03-stable31"]`. The next physical run starts from authentic CCC generation2; existing v3 lifecycle receipts remain historical and are not rebound.

Change only the new cohort ID, workflow revision to actual M, rendered caller digest, supporting evidence paths and derived candidate/record/event digests. The workflow file blob intentionally stays714. The new candidate attributes reused publication evidence explicitly and leaves every fresh qualification/signature/producer-resolution flag false. Native structural validation does not count as the full live verification.

The sole repository proposal is:

- `files/governance/docs-qualified-cohorts.json`
- `files/governance/evidence/docs-cohorts/docs-2026-11-27-orchestrator-v4/candidate-input.json`
- `files/governance/evidence/docs-cohorts/docs-2026-11-27-orchestrator-v4/publication.json`

`preparation-manifest.json` is local review metadata, not a fourth repository delta. The existing closure file is reused unchanged. A genuine trusted source-A full verification is required before a separate VERIFIED/QUALIFIED append; final source-B checks, protected merge, desired policy, fresh physical lifecycle and observed/CANARY evidence remain separate.
