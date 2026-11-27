# Post-consumer Orchestrator v4 proposal preparation

This is an **uninvoked local draft**. It constructs a proposal only after real protected-main observations and genuine successful four-role consumer workflow evidence exist. It makes no network requests, writes no Git objects or refs, and changes no settings. The original v3 builder remains byte-identical.

The planned cohort name is `docs-2026-11-27-orchestrator-v4`. No prospective record digest, QUALIFIED event, merged source SHA, consumer main SHA, workflow run, or receipt has been assigned. `input.template.json` deliberately contains nulls and is not runnable evidence.

## Differences from the retained v3 builder

- Derive record/candidate/QUALIFIED/caller identities from the actual new v4 record on the supplied protected Central main snapshot; reject an absent or unqualified record. No fixed future sequence number is assumed.
- Require the real merged PR467 observation, exact repaired merge tree, current-main ancestry from its actual merged source M, and successful native Node26/Node24 main runs on M.
- Pin the corrected receipt verifier bytes: Git blob `15090b6ce1ca77f3591f3337137d564b4c82dc87`, SHA256 `e64a63e02801a8259892eca3424149885b8a4779dc6ad3ea44d7fbd8e08748fd`.
- Bind the retained four-role workflow body `714af12998ef140dd55a2ec3057f67775586cfd7` to actual M. The new selected source is never the historical `997f2439…` or the temporary V10 source branch.
- Preserve every v3 record field except the already agreed successor identity/workflow/rendered-caller/evidence-path changes. Packages, SRI, publication/provenance, policy3.1, closure7957, schema/runtime, eligibility, stable31 edges, and Orchestrator-only canary ownership remain exact.
- Keep the existing observed-only → CANARY ordering, all thirteen policy rows, the twelve-field observed proof, and the fifteen-field CANARY proof.
- Do not claim global recovery or physical lifecycle qualification. Real v3 A/B/C evidence is retained elsewhere; it is not an input to this v4 consumer-main proposal builder. Run45972172068 remains an overall failed Host job despite successful physical A/B/C.

## Exact input contract

Invocation, only when the real inputs exist:

```text
node prepare-orchestrator-post-consumer-v4.mjs --mode observed|canary --input ABS_INPUT --output FRESH_ABS_OUTPUT
```

Every `descriptor` below is exactly `{ "path": ABSOLUTE_PATH, "sha256": ACTUAL_FILE_SHA256 }`. The hash accepts the `sha256:` prefix. Paths must resolve without symlinks inside the supplied `proofRoot`; files are read with bounded stable reads. The manifest itself must be inside `proofRoot`. The fresh output directory must be outside and disjoint from both proofRoot and validatorRoot.

Top-level closed fields are `schemaVersion` (1), `observedAt` (actual UTC observation timestamp), `proofRoot`, `validatorRoot`, `successor`, `central`, and `consumer`.

### successor — nine genuine descriptors

| Field | Required actual content |
|---|---|
| repairPull | GitHub PR467 JSON after merge: id5524611730; owner777genius/id13103045; exact head611cd2a7, base d167b236; merged true; actual merge_commit_sha M. |
| mergeCommit | Actual one-parent squash commit M: parent d167b236, tree31561be5; author Илия / iliyazelenkog@gmail.com, GitHub committer / noreply@github.com, verified signature with reason valid. |
| mergeTree | Complete recursive Git tree for M. |
| compareRepair | Actual compare d167b236…M; exact two modified repaired files; ahead_by and total_commits equal1; complete commit list exactly[M]. |
| compareCurrent | Actual compare M…current Central snapshot; M must remain the merge base and the current snapshot must be its descendant. |
| workflow | Exact workflow bytes at M, bound to `.github/workflows/docs-protocol-check.yml` and unchanged reviewed blob714af129. |
| receipt | Exact corrected receipt verifier bytes at M, bound to blob15090b6c and the reviewed SHA256. |
| nativeNode26 | Actual successful completed push/main Actions run on M for `.github/workflows/ci.yml`. |
| nativeNode24 | Actual successful completed push/main Actions run on M for `.github/workflows/node24-compatibility.yml`. |

### central — unchanged closed fields

`repository`, `branch`, `commit`, and `tree` are actual GitHub descriptors. Branch must be protected main and match the supplied Git commit. `files` contains exactly these four raw byte descriptors, bound to that tree:

- `governance/docs-protocol-policy-v2.json`
- `governance/docs-qualified-cohorts.json`
- `governance/docs-protocol-exceptions.json`
- `governance/code-security-defaults.json`

The current registry must contain the immutable f61 v3 record and exactly one genuine v4 record with its real PUBLISHED_UNQUALIFIED → VERIFIED → QUALIFIED sequence. The v4 record must select workflow revision M and preserve the unchanged v3 boundary tuple. Future digests are obtained from this authenticated record and native validation; the manifest has no field that can supply invented substitutes.

`validatorRoot` must contain the actual pinned validator files, schemas, package.json and pnpm-lock.yaml from this Central tree. Only the reviewed receipt verifier pin differs from the retained builder. No dependency installation is performed.

### consumer — unchanged sixteen closed fields

| Field | Required actual content |
|---|---|
| repository | Actual Orchestrator repository metadata, id1310245598. |
| branchBefore, branchAfter | Two actual protected main branch observations around collection, both at the same eventual merged revision. |
| commit, tree | That revision's Git commit and complete recursive Git tree. |
| run | Actual completed successful push/main run of `.github/workflows/docs-protocol.yml`, referencing M. |
| jobs | Complete latest-attempt response containing exactly the four successful roles: trusted-authorize, trusted-structural, trusted-qualification, docs-protocol-check. |
| checks | Complete paginated check-runs on that exact consumer revision; all decisive App15368 semantic Docs checks must succeed. |
| comparePrior | Actual comparison from the earlier observed consumer revision to the eventual merged revision. |
| files | Every raw consumer file named by the actual authorization's fileDigests; exact paths are determined by that genuine authorization. |
| artifacts | Complete artifact listing for the same actual run/attempt. |
| authorizationZip, qualificationZip | Original downloaded ZIP bytes, matched to genuine artifact ID/size/SHA256/run/head and exact allowed members. |
| authorization | Actual `docs-gate-authorization.json` member. |
| receipt | Actual `docs-qualification-receipt.json` member. |
| installEvidence | Actual `docs-qualification-install-evidence.json` member with five installed package identities. |

The corrected authorization digest uses ordinal keys. Receipt and execution-envelope domains remain with their native helpers. The expected execution envelope is constructed only as an internal verifier argument: it is never exported or misrepresented as an uploaded artifact. A supporting consumer receipt does not itself satisfy Central CANARY authority.

## Ordered proposal gates

1. **Observed mode:** the actual policy still selects v4 as desired while observed remains stable31/rollout_pending. The authorization controller snapshot must equal the proposed Central base exactly, and its controller file digests must match that base. Only the Orchestrator observed fields and qualification observed revision change; the other twelve repository rows, desired fields, and all top-level policy state are preserved. Output is only the policy file.
2. Root reviews, publishes and ordinarily merges that exact observed proposal, then obtains fresh Central evidence. This step is outside the draft's authority.
3. **CANARY mode:** the current merged policy already binds v4 at the same real consumer revision and the same run/check/caller coordinates. The retained target's last event must still be QUALIFIED. Only then can the builder propose one appended CANARY event plus inert supporting evidence. All cohort records and all previous events remain unchanged. Output is only the registry and the new v4 canary.json.
4. Root must revalidate live observations and required gates before each merge. A successful offline proposal is never a claim that a merge happened. This builder leaves the separate global recovery work pending and does not write any incident, grant or recovery authority.

## Verification performed so far

Only source inspection, exact bounded transformations and `node --check` have been performed. Neither mode has been invoked; there are no generated policy/CANARY proposals or future observed outcomes.
