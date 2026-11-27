# Successor Host integration draft

This is a disposable hosted conformance adapter. It has not been invoked. It
does not produce qualification authority, run the migration, select a Cohort,
commit, push, or replay archived restoration evidence.

Run the strict TypeScript check before invocation. Invoke the helper with the
actual metadata file and its separately selected SHA256:

    node orchestrator-host-successor.ts --input ABSOLUTE_METADATA --expect sha256:HEX

The input must be ordinary JSON with this exact top-level shape. Every Ref is
an object containing an absolute canonical path, bytes (a nonnegative safe
integer), and sha256 (including the sha256: prefix). Values must come from
actual observations. This contract is not an example successful input.

    {
      schemaVersion: 1,
      scope: "orchestrator-successor-host-integration",
      candidateRoot: ABSOLUTE_CLEAN_CHECKOUT_AT_C01,
      outputRoot: ABSOLUTE_FRESH_EXTERNAL_DIRECTORY,
      legacy: {
        exportRoot: ABSOLUTE_VERIFIED_V3_HOST_EXPORT,
        evidenceRoot: ABSOLUTE_VERIFIED_V3_EVIDENCE,
        integrationRun: Ref(exportRoot/integration-run.json),
        summary: Ref(evidenceRoot/summary.json),
        assets: Ref(evidenceRoot/managed-assets-manifest.json),
        physicalArtifact: {
          id: "15188626286", bytes: 1814712,
          sha256: "sha256:c0007a199de47148c1c3ecf4f333a6ab484aa9a0188cc89e9d88c451f2d37704",
          runId: "45972172068", runAttempt: "1",
          headSha: "c29a5b3d4dbe4beabfc0e5acc1d026eeedc54a14"
        },
        hostExportArtifact: {
          id: "15189536852", bytes: 3863848,
          sha256: "sha256:ff7b7ea0bbe849c71e72ae7d8dc210bb928ffb0333bdaca49955654bf525d14d",
          runId: "45981324003", runAttempt: "1",
          headSha: "39974166661c06c824994ad4abf219a36825510e"
        }
      },
      forward: {
        targetRoot: ABSOLUTE_LIVE_FORWARD_CHECKOUT_AT_CCC,
        evidenceRoot: ABSOLUTE_LIVE_FORWARD_EVIDENCE,
        observation: Ref(evidenceRoot/forward-observation.json)
      },
      authority: {
        revision: ACTUAL_PROTECTED_SNAPSHOT_SHA,
        registry: Ref(ACTUAL_REGISTRY_JSON),
        policy: Ref(ACTUAL_POLICY_JSON),
        cohortId: "docs-2026-11-27-orchestrator-v4",
        recordDigest: ACTUAL_NEW_RECORD_DIGEST,
        qualificationEventDigest: ACTUAL_NEW_QUALIFIED_EVENT_DIGEST
      },
      runtime: {
        controllerRoot: ABSOLUTE_COMPLETE_EXTERNAL_NPM_INSTALLATION,
        controllerCli: Ref(ACTUAL_PUBLISHED_CONTROLLER_CLI),
        node24: Ref(ACTUAL_PHYSICAL_NODE24_EXECUTABLE),
        node26: Ref(ACTUAL_PHYSICAL_NODE26_EXECUTABLE),
        corepack: Ref(ACTUAL_COREPACK_JS_ENTRYPOINT),
        observation: Ref(forward.evidenceRoot/runtimes.json)
      }
    }

The caller must independently verify both artifact API identities, archive
digests, safe extraction and the successful Host framed export before selecting this input.
The helper checks the selected export's fifty exact files, raw Host command
results, original phase results and retained bundle; it does not pretend a
locally supplied artifact descriptor is a new GitHub observation.

The original physical job concluded failure after its physical step succeeded;
its later Host CSpell check failed on one word. The separate archived-target
Host continuation uses the original physical output bytes and preserves the old
run/root identity. The helper requires its actual successful export and distinct
Host run attribution. No archive alone is labelled a complete successful job.

## Forward observer wire contract

The existing draft forward harness emits this contract. Its observation has
schemaVersion 1, scope physical-managed-successor-forward, outcome passed and
qualificationAuthority false. It contains run (repository, runId, runAttempt,
headSha), source (revision, tree, the full actual consumer identity), the actual
authorityRevision and target (cohortId, recordDigest, qualificationEventDigest).

Its assets array contains the seven sorted genuine managed file descriptors.
Its files array contains exactly these twelve paths:

- commands/successor-prepare.meta.json, .stdout.json, .stderr.log
- commands/successor-finalize.meta.json, .stdout.json, .stderr.log
- commands/successor-check.meta.json, .stdout.json, .stderr.log
- proofs/forward/completion.json.prepared
- proofs/forward/completion.json
- proofs/forward/completion.json.receipt

Each descriptor has path, bytes, sha256, gitBlob and mode. Mode is a Git-style
regular-file mode: 100600 for private proof files, or 100644/100755 as actually
observed. The helper compares descriptors to live bytes and modes, then checks
the public preparation, completion, receipt, command flags and physical root
binding itself. It does not treat the observer's outcome field as proof.

## Output and scope

The candidate starts at c01. All fifty verified v3 Host exported files are applied.
The twenty-eight old inert evidence files remain byte-identical. The new pure
target must preserve the old pure package, workspace, selected lock and Node
pin bytes; only caller, profile and state are imported anew. The current
Cohort assertion and current narrative in four existing documents are updated.
The original IAM and required eighteen quality identities stay unchanged.

The new directory docs/research/evidence/managed-docs-orchestrator-v4-2026-11-27
contains a manifest and the nine unmodified forward command output files
(stderr.log is archived as stderr.txt). Its proof copies remain external.

The helper uses the original strict frozen installation behavior, then peers,
ordered Docs discovery/context, fresh public managed check and full Docs checks.
There is no lock regeneration or dependency update. The selected Host lock must
remain identical. Ordinary final PR/main CI still owns full product acceptance.

Output contains sixty candidate files under files/, actual commands/, and
successor-integration-run.json. Existing
ORCHESTRATOR_HOST_FILE/CHUNK/END framing carries the final candidate files;
ORCHESTRATOR_HOST_EVIDENCE framing carries the detailed result. No success is
exported unless all checks pass. No final-head, main, CANARY, or v4 fault/rollback
success is claimed.
