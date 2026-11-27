#!/usr/bin/env node
// Hosted-only owner reconciliation. Never mutate the physical consumer or live proofs.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { chmod, lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createSelectedLockDraft } from "./orchestrator-selected-lock.mjs";
import { selectArchivedHostArgument, validateArchivedHostInput } from "./orchestrator-host-archive-input.ts";

const BASE = "c01efb6813f0c048497caeefbb8235cead480cb2";
const SOURCE = "ccc73331a2ca4f498a51fb6ee0f50b5d0cecff67";
const SOURCE_TREE = "a24da96493edd1c6fe3bd5868d4cf636007bcf04";
const COHORT = "docs-2026-11-27-orchestrator-v3";
const RECORD = "sha256:f61e98c96fcc7beab30b6956312dead50a363c403fd67cdce4d0f18e8e69424c";
const REQUIRED_HASH = "a26ff983529afb2b492706253293664df596705bdaae7882aa6b030c16905f35";
const EVIDENCE_PATH = "docs/research/evidence/managed-docs-orchestrator-v3-2026-11-27";
const INPUT_BINDING = {
  "sourceRevision": "ccc73331a2ca4f498a51fb6ee0f50b5d0cecff67",
  "sourceTree": "a24da96493edd1c6fe3bd5868d4cf636007bcf04",
  "sourceLockSha256": "sha256:0ebee389b33d6ee41beb3f4a3dd28e20f956c177b17a2911d5a812160ea07044",
  "sourceLockGitBlob": "596614ef81a97d2b825e06d15086ca36dd20656a",
  "originalMainRevision": "3dccf2c53bf11f3939a19734a58f5e64d96673d0",
  "sourceAdmission": {
    "metaSha256": "sha256:94296a4fcdec10ce7e4eb054edb8341a54478a695a4df930d1e138f9bb1dd1a5",
    "stdoutSha256": "sha256:75d35e87cbc93c3016584bb8a19f73a422488932447e9fb486ad034a2d178977",
    "preparationSha256": "sha256:b7849c93c324c184c2aaccfc9c86a98e1a2a62c5957e4fabb75b6c09f247cae7",
    "replayable": false,
    "finalPhysicalConsumerQualified": false
  },
  "authoritySnapshotRevision": "d167b2360524474240a43e3ff70e35eb94e109c7",
  "target": {
    "cohortId": "docs-2026-11-27-orchestrator-v3",
    "recordDigest": "sha256:f61e98c96fcc7beab30b6956312dead50a363c403fd67cdce4d0f18e8e69424c",
    "qualificationEventDigest": "sha256:4451ea715ef68048c01e182fe4755acc4639d7d2e106e536e2b240834e7084c0",
    "policy": {
      "id": "agent-teams.docs-protocol-current-policy",
      "version": "3.1.0",
      "digest": "sha256:18db0135d1d6191ef78c1feb243f5dc672aaed9985f52be1a72af4fdd7e9bb4e"
    },
    "workflow": {
      "repository": "agent-teams-ai/.github",
      "path": ".github/workflows/docs-protocol-check.yml",
      "revision": "997f24396598f93cf1b03bb26436a5ec7686ddef",
      "blobSha": "714af12998ef140dd55a2ec3057f67775586cfd7"
    },
    "callerDigest": "sha256:2ce33590e2d5d36a14bcdf3f16e6ca5422c4b3ebe300f3ac4d94343cc022e1ac",
    "closure": {
      "digest": "sha256:7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475",
      "path": "governance/docs-runtime-closures/sha256-7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475.json",
      "packageCount": 88
    },
    "packages": {
      "repositoryMutation": {
        "name": "@agent-teams/repository-mutation",
        "version": "0.5.2",
        "integrity": "sha512-eK/HsE/1qt+TXzrrbggXykZJXloFZfZD0ZlwdGbm2Jc9O6lAlhu7+w9BdSeryX/vCyMYWeRLv38S/7V717RPMg=="
      },
      "documentAuthoring": {
        "name": "@agent-teams/document-authoring",
        "version": "0.3.9",
        "integrity": "sha512-a6SOuytNOoKJVW+pp51AUMhrjzTvbYvro6nUuAFqmu0l0G63xkSAnhpwlaPJbHSbSBvoIawm8z+nL8OVMFIY3A=="
      },
      "docsProtocol": {
        "name": "@agent-teams/docs-protocol",
        "version": "0.6.9",
        "integrity": "sha512-rZ7Ie43dmN+m8LjCdXt5iqOP5h41M/TWNFg7bwvV05/XuSJrJF4udBLXIReqqVfeqdoYrFNxPbTknKJ30N6aTA=="
      },
      "docsProtocolAgentTeams": {
        "name": "@agent-teams/docs-protocol-agent-teams",
        "version": "0.8.0",
        "integrity": "sha512-BixlYEalI0/j4auoSLBSBlKJGUXyZeuKS3WI+5nxdiAPg/yyAtKHjhmxuo059YZPn0+R931M0sdpNHRkpgDUDg=="
      },
      "engineeringFoundation": {
        "name": "@agent-teams/engineering-foundation",
        "version": "4.0.3",
        "integrity": "sha512-D/q979O6OOhsS3IpkwKwb1wNDcXcJESKbYATz7Gk8biiXYxC2tIGi5S9er/DQDbghOnzrilipKxvTMJZ1GGolg=="
      }
    }
  },
  "controller": {
    "version": "0.8.0",
    "integrity": "sha512-BixlYEalI0/j4auoSLBSBlKJGUXyZeuKS3WI+5nxdiAPg/yyAtKHjhmxuo059YZPn0+R931M0sdpNHRkpgDUDg==",
    "buildIdentity": "sha256:5d5563eb771de586b7d43e58aa68d1e62d92a58bff87a362ff5b8b7d582dac80"
  },
  "kernel": {
    "version": "0.5.2",
    "integrity": "sha512-eK/HsE/1qt+TXzrrbggXykZJXloFZfZD0ZlwdGbm2Jc9O6lAlhu7+w9BdSeryX/vCyMYWeRLv38S/7V717RPMg==",
    "buildIdentity": "sha256:89c1df01b0fd3ea5d8db6adf51fa65a92f8509aaffde78217cb31a2c9084e8e1"
  },
  "runtime": {
    "node24": "24.22.3",
    "node26": "26.12.1",
    "sourcePin": "26.11.1\n",
    "targetPin": "26.12.1\n",
    "sourcePnpm": "11.18.0",
    "targetPnpm": "11.20.0"
  },
  "selectedLock": {
    "path": "/workspace/scratch/e36de90adcfd/iam-e2e-resume-20261127/selected-lock-v3-preparation/actual-7957/selected-target/selected-target-lock.yaml",
    "bytes": 320228,
    "sha256": "sha256:a8080107bb13e2170fee5e3f25f30ff5df835cd5e540e66f177a0ef0e57c264b",
    "gitBlob": "5b452244b3d74dd49432e659abd575efca49c4c2"
  },
  "selectedLockReportSha256": "sha256:4e04cf99c102c94f4289922a0bfb9a710ef6a7b6f578b126cbcaa3e26c716cdf"
};
const ASSETS = [
  ".github/workflows/docs-protocol.yml",
  ".node-version",
  "architecture/foundation/docs-consumer-integration.json",
  "architecture/foundation/docs-protocol-managed-state.json",
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml",
].sort();
const FULL_ASSETS = [".github/workflows/docs-protocol.yml", ".node-version",
  "architecture/foundation/docs-consumer-integration.json",
  "architecture/foundation/docs-protocol-managed-state.json"];
const TUPLE = {
  "@agent-teams/repository-mutation": "0.5.2",
  "@agent-teams/document-authoring": "0.3.9",
  "@agent-teams/docs-protocol": "0.6.9",
  "@agent-teams/docs-protocol-agent-teams": "0.8.0",
  "@agent-teams/engineering-foundation": "4.0.3"
};
const DIRECT = Object.keys(TUPLE).slice(2);
const LABELS = ["A-prepare", "A-fault", "A-resume", "A-restore", "B-prepare",
  "B-finalize", "B-committed-restore", "C-prepare", "C-finalize"];
const TEXT_EDITS = [
  {
    "path": ".github/workflows/architecture.yml",
    "before": "version: 11.18.0",
    "after": "version: 11.20.0",
    "count": 3
  },
  {
    "path": ".github/workflows/docs.yml",
    "before": "version: 11.18.0",
    "after": "version: 11.20.0",
    "count": 1
  },
  {
    "path": ".github/workflows/od035-native-research.yml",
    "before": "version: 11.18.0",
    "after": "version: 11.20.0",
    "count": 1
  },
  {
    "path": "scripts/docs/docs-protocol-profile.test.mjs",
    "before": "assert.equal(integration.schemaVersion, 3);",
    "after": "assert.equal(integration.schemaVersion, 4);",
    "count": 1
  },
  {
    "path": "scripts/docs/docs-protocol-profile.test.mjs",
    "before": "\"@agent-teams/docs-protocol\": \"0.6.2\"",
    "after": "\"@agent-teams/docs-protocol\": \"0.6.9\"",
    "count": 1
  },
  {
    "path": "scripts/docs/docs-protocol-profile.test.mjs",
    "before": "\"@agent-teams/docs-protocol-agent-teams\": \"0.3.2\"",
    "after": "\"@agent-teams/docs-protocol-agent-teams\": \"0.8.0\"",
    "count": 1
  },
  {
    "path": "scripts/architecture/quality-source-coverage.test.mjs",
    "before": "assert.equal(pkg.devDependencies[\"@agent-teams/docs-protocol-agent-teams\"], \"0.3.2\");",
    "after": "assert.equal(pkg.devDependencies[\"@agent-teams/docs-protocol-agent-teams\"], \"0.8.0\");",
    "count": 1
  },
  {
    "path": "scripts/architecture/quality-source-coverage.test.mjs",
    "before": "assert.equal(managed.cohortId, \"docs-2026-10-03-stable31\");",
    "after": "assert.equal(managed.cohortId, \"docs-2026-11-27-orchestrator-v3\");",
    "count": 1
  },
  {
    "path": "scripts/architecture/quality-source-coverage.test.mjs",
    "before": "assert.equal(managed.packages.engineeringFoundation.version, \"1.7.2\");",
    "after": "assert.equal(managed.packages.engineeringFoundation.version, \"4.0.3\");",
    "count": 1
  },
  {
    "path": "scripts/architecture/quality-source-coverage.test.mjs",
    "before": "assert.equal(managed.packages.docsProtocolAgentTeams.version, \"0.3.2\");",
    "after": "assert.equal(managed.packages.docsProtocolAgentTeams.version, \"0.8.0\");",
    "count": 1
  },
  {
    "path": "scripts/architecture/quality-source-coverage.test.mjs",
    "before": "// Compiler/tooling migration does not rewrite a historical managed-admission receipt.",
    "after": "// Managed Docs and the installed Host Foundation must share the admitted current tuple.",
    "count": 1
  },
  {
    "path": "scripts/architecture/quality-source-coverage.test.mjs",
    "before": "assert.notEqual(managed.packages.engineeringFoundation.version, foundation.version);",
    "after": "assert.equal(managed.packages.engineeringFoundation.version, foundation.version);",
    "count": 1
  },
  {
    "path": "AGENTS.md",
    "before": "The root quality tooling lane defaults to Node `26.11.1` and pnpm `11.18.0`",
    "after": "The root quality tooling lane defaults to Node `26.12.1` and pnpm `11.20.0`",
    "count": 1
  },
  {
    "path": "AGENTS.md",
    "before": "gates on the corrected candidate. Its previous stable31 managed Docs records do\nnot match the new Foundation tuple: report the central admission dependency and\nkeep the candidate unmergeable as a completed managed upgrade until the actual\nsuccessor transition and receipts qualify. Never rewrite old evidence to fit pins.",
    "after": "gates on the corrected candidate. The hosted retained controller produced the\norchestrator-v3 managed successor from the reviewed stable31 preparation source. Its actual\npreparation, receipt-write refusal, fresh-process resume, source restoration and\ncommitted rollback observations are retained in the\n[managed transition evidence](docs/research/evidence/managed-docs-orchestrator-v3-2026-11-27/manifest.json).\nKeep original receipts as history. Final-head CI, the resulting main observation\nand central observed binding remain separate completion conditions.",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "they do not qualify this integration. Current-main managed profiles, state and\ncaller remain unchanged. Node.js package compatibility does not establish managed Docs execution",
    "after": "they do not qualify this integration. This candidate carries the actual orchestrator-v3\nmanaged profile, state and caller; resulting-main qualification remains separate.\nNode.js package compatibility does not establish managed Docs execution",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "The default root tooling lane uses Node `26.11.1`; pnpm remains `11.18.0`.",
    "after": "The default root tooling lane uses Node `26.12.1` and pnpm `11.20.0`.",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "and adapter `0.3.2` tuple. The current tooling candidate installs Foundation\n`4.0.2`; it is not a matching stable31 managed consumer. Keep the original\nintegration/state/receipts unchanged as the previous admitted tuple and the PR\nunmergeable as a completed managed migration until the eligible central desired\ntransition and real successor assets/receipts exist. Registry installation and\nportable semantic checks cannot substitute for that admission.",
    "after": "and adapter `0.3.2` tuple. Those receipts retain their original identities.\nThe hosted retained controller subsequently produced the orchestrator-v3 successor\nwith Foundation `4.0.3`, Docs `0.6.9` and adapter `0.8.0`. The\n[actual hosted observations](../research/evidence/managed-docs-orchestrator-v3-2026-11-27/manifest.json)\nrecord the physical source, authority, commands and output digests. This candidate\npreserves those managed assets while reconciling the separately owned Host\nconfiguration. Final-head checks, actual-main qualification and central observed\nadvancement remain required; registry installation alone does not establish them.",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "Complete the\ncoupled managed upgrade through its actual owner, including its five-package\nprojection, profile/state/caller, runtime and observed default-branch evidence.",
    "after": "Preserve the actual owner's\nfive-package projection, profile/state/caller and retained runtime evidence.\nComplete the final consumer and observed default-branch gates separately.",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "Docs `0.6.2` / adapter `0.3.2` remain installed. Stable31 records are the previous admission, not a matching new Foundation tuple; successor admission is pending",
    "after": "Candidate Docs `0.6.9` / adapter `0.8.0` come from the actual orchestrator-v3 transition. Stable31 receipts remain historical; resulting-main observation is still required",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "Portable Docs retains its old transitive pair; Foundation 4 uses the new pair. This candidate is not a completed managed five-package transition; preserve exact-build recovery evidence",
    "after": "Candidate Portable Docs and Foundation 4 use the admitted `0.3.9` / `0.5.2` pair. Preserve the actual physical transition and exact-build recovery evidence",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "has stable33 generation 3 VERIFIED/QUALIFIED at event 189, while stable31 remains\nRECOMMENDED at event 186. Only the declared Extension Foundation canary may take\nthe narrower candidate route; Orchestrator is not that canary.",
    "after": "recorded stable33 generation 3 VERIFIED/QUALIFIED at event 189 and stable31\nRECOMMENDED at event 186. That historical Extension Foundation canary selection\ndid not authorize Orchestrator. The later hosted transition used its own\norchestrator-v3 record and consumer selection at\n[the observed protected revision](https://github.com/agent-teams-ai/.github/blob/@@AUTHORITY@@/governance/docs-qualified-cohorts.json).",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "PR #111's [trusted Docs run](https://github.com/agent-teams-ai/agent-teams-orchestrator/actions/runs/45908886931)\nloads validator `b30455e32cf5d54ade6d8301637701347e4ce57c` and rejects the\ncurrent registry's generation 3 row at `/cohorts/44` before consumer execution.\nThis controller/schema incompatibility is an upstream operational blocker, not\nfailed IAM or module behavior. Its repair must retain authenticated workflow,\ncurrent controller and managed adoption boundaries; a new package pin alone\ncannot repair it. Central [#434](https://github.com/agent-teams-ai/.github/pull/434)\nselects the Extension Foundation canary; [#441](https://github.com/agent-teams-ai/.github/pull/441)\nhandles finite Runtime retirement recovery. Neither implements Orchestrator's\neligible controller/Cohort transition. The central governance owner must qualify\nthat transition and its consumer-specific desired selection; these existing PRs\nand their source qualification do not constitute Orchestrator migration evidence.",
    "after": "The earlier [trusted Docs run](https://github.com/agent-teams-ai/agent-teams-orchestrator/actions/runs/45908886931)\nloaded validator `b30455e32cf5d54ade6d8301637701347e4ce57c` and rejected the\nregistry's generation 3 row at `/cohorts/44` before consumer execution. That\nupstream controller/schema refusal remains historical evidence; it was not an\nIAM or module-runtime failure. Central\n[#434](https://github.com/agent-teams-ai/.github/pull/434) selected the Extension\nFoundation canary, while [#441](https://github.com/agent-teams-ai/.github/pull/441)\nprovided finite Runtime retirement recovery. The separate Orchestrator orchestrator-v3\nrecord and desired selection preceded the actual\n[hosted lifecycle run](@@RUN_URL@@). Its retained outputs establish only the\nrecorded physical lifecycle and do not substitute for final-head or main CI.",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "retain real defect/refusal evidence and the separate pending managed admission",
    "after": "retain real defect/refusal evidence, the actual orchestrator-v3 managed tuple and the separate resulting-main gate",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "A frozen installation, installed registry assertion and Stack doctor passed on\nthe initial compatible Node 24 check; the exact default Node `26.11.1` and pnpm\n`11.18.0` lane now exercises the migrated checks. The final PR evidence must state\nactual results and unresolved failures; this paragraph does not certify every\nnative/managed gate or a target's production behavior.",
    "after": "The earlier frozen installation, installed registry assertion and Stack doctor\npassed on the initial compatible Node 24 check. The orchestrator-v3 candidate selects\nNode `26.12.1` and pnpm `11.20.0`; its Host engine declaration retains Node 24\ncompatibility for the separate required lane. The final PR evidence must state\nactual results and unresolved failures; this paragraph does not certify every\nnative/managed gate or a target's production behavior.",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "Trusted managed Docs remains blocked by its independent central controller and\ncohort transition. Portable Docs `0.6.2` has no Foundation runtime edge and keeps\nits ordinary semantic route. Preserve that required route and the old managed\nreceipts while preparing the actual admitted successor. A green portable check\nor `assert-registry` result is not a managed Cohort qualification receipt.",
    "after": "The real hosted controller completed retained preparation, an actual receipt\nwrite refusal, a fresh-process resume, source restoration and committed rollback,\nthen produced the final orchestrator-v3 managed target. The\n[inert evidence manifest](../research/evidence/managed-docs-orchestrator-v3-2026-11-27/manifest.json)\nbinds the actual source root, command outputs and generated file digests. It\nclaims no successful execution in the unavailable local environment. The Host\nintegration retains the original controller output files as evidence and records\nits package/workspace/lock reconciliation separately. Ordinary final-head and\nresulting-main checks and central observed advancement remain separate gates.",
    "count": 1
  },
  {
    "path": "docs/open-decisions/OD-020-architecture-conformance-tooling.md",
    "before": "The candidate's managed admission is still a separate completion gate.",
    "after": "The actual orchestrator-v3 managed transition is recorded in the\n[hosted lifecycle evidence](../research/evidence/managed-docs-orchestrator-v3-2026-11-27/manifest.json).\nFinal consumer and resulting-main admission remain separate completion gates.",
    "count": 1
  },
  {
    "path": "docs/research/orchestrator-full-foundation-review-2026-11-26.md",
    "before": "installed checks from the still-required managed Cohort transition. This is an\nimplementation candidate, not a claim that all F0–F9 capabilities are qualified.",
    "after": "installed checks from the\n[actual hosted managed transition](evidence/managed-docs-orchestrator-v3-2026-11-27/manifest.json)\nand the still-required final-head and resulting-main gates. This is an\nimplementation candidate, not a claim that all F0–F9 capabilities are qualified.",
    "count": 1
  },
  {
    "path": ".github/workflows/architecture.yml",
    "before": "node-version: \"24.21.0\"",
    "after": "node-version: \"24.22.3\"",
    "count": 1
  },
  {
    "path": ".github/workflows/od035-native-research.yml",
    "before": "node-version: \"24.21.0\"",
    "after": "node-version: \"24.22.3\"",
    "count": 1
  },
  {
    "path": ".github/workflows/reviewrouter-interaction.yml",
    "before": "node-version: \"26.11.1\"",
    "after": "node-version: \"26.12.1\"",
    "count": 1
  },
  {
    "path": "scripts/architecture/quality-source-coverage.test.mjs",
    "before": "assert.equal(pkg.devDependencies[\"@agent-teams/engineering-foundation\"], \"4.0.2\");",
    "after": "assert.equal(pkg.devDependencies[\"@agent-teams/engineering-foundation\"], \"4.0.3\");",
    "count": 1
  },
  {
    "path": "scripts/docs/docs-protocol-profile.test.mjs",
    "before": "\"@agent-teams/engineering-foundation\": \"4.0.2\"",
    "after": "\"@agent-teams/engineering-foundation\": \"4.0.3\"",
    "count": 1
  },
  {
    "path": "AGENTS.md",
    "before": "under the product owner's explicit Node default migration. Node `24.21.0`",
    "after": "under the product owner's explicit Node default migration. Node `24.22.3`",
    "count": 1
  },
  {
    "path": "AGENTS.md",
    "before": "selects Foundation `4.0.2`, Stack `0.3.1` and TS `7.0.2`",
    "after": "selects Foundation `4.0.3`, Stack `0.3.1` and TS `7.0.2`",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "The product owner's current migration selects Node.js `26.11.1` as the\nroot tooling default. Node.js `24.21.0` remains an explicit compatibility lane.",
    "after": "The product owner's current migration selects Node.js `26.12.1` as the\nroot tooling default. Node.js `24.22.3` remains an explicit compatibility lane.",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "repository gate. The package engine ranges remain unchanged.",
    "after": "repository gate. The root package engine range follows the qualified managed\npolicy: `>=24.22.3 <25 || >=26.12.1 <27`.",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "Foundation `4.0.2`, Stack Toolchain",
    "after": "Foundation `4.0.3`, Stack Toolchain",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "Foundation `4.0.2` supports production",
    "after": "Foundation `4.0.3` supports production",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "Node `24.21.0` retains an explicit compatibility lane.",
    "after": "Node `24.22.3` retains an explicit compatibility lane.",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "Candidate pins `4.0.2` / `0.4.3`;",
    "after": "Candidate pins `4.0.3` / `0.4.3`;",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "including the candidate `4.0.2`;",
    "after": "including the candidate `4.0.3`;",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "Foundation `4.0.2` uses the native",
    "after": "Foundation `4.0.3` uses the native",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "Its Node.js 26.11.1 runner source keeps",
    "after": "Its Node.js 26.12.1 runner source keeps",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "Foundation `4.0.2` supplies the native",
    "after": "Foundation `4.0.3` supplies the native",
    "count": 1
  },
  {
    "path": "docs/research/orchestrator-full-foundation-review-2026-11-26.md",
    "before": "The active candidate uses published Foundation `4.0.2`,",
    "after": "The active candidate uses published Foundation `4.0.3`,",
    "count": 1
  },
  {
    "path": "docs/architecture/dependency-rules.md",
    "before": "`@agent-teams/engineering-foundation` `4.0.2` for repository engineering gates,",
    "after": "`@agent-teams/engineering-foundation` `4.0.3` for repository engineering gates,",
    "count": 1
  },
  {
    "path": "docs/architecture/feature-module-standard.md",
    "before": "The owner-authorized Foundation `4.0.2` tooling candidate replaces the historical",
    "after": "The owner-authorized Foundation `4.0.3` tooling candidate replaces the historical",
    "count": 1
  },
  {
    "path": "docs/architecture/security-architecture.md",
    "before": "immutably. Its Node.js 26.11.1 runner keeps exact-source SHA-256",
    "after": "immutably. Its Node.js 26.12.1 runner keeps exact-source SHA-256",
    "count": 1
  },
  {
    "path": "docs/open-decisions/OD-035-local-durable-workflow-engine.md",
    "before": "user; PostgreSQL does not run as root. Node `24.21.0` is the repository's explicit",
    "after": "user; PostgreSQL does not run as root. Node `24.22.3` is the repository's explicit",
    "count": 1
  },
  {
    "path": "scripts/security/validate-reviewrouter-workflow.mjs",
    "before": "336a904791d2e84164b44b2342aa5acc6d63cff36aac71cbce80a8c6fc8b8843",
    "after": "0f9aa7afe102feccf23de1ed53fac5fe8a76bad738fc3fda50a79016fa22006f",
    "count": 1
  },
  {
    "path": "docs/architecture/security-architecture.md",
    "before": "336a904791d2e84164b44b2342aa5acc6d63cff36aac71cbce80a8c6fc8b8843",
    "after": "0f9aa7afe102feccf23de1ed53fac5fe8a76bad738fc3fda50a79016fa22006f",
    "count": 1
  },
  {
    "path": "docs/architecture/repository-tooling.md",
    "before": "336a904791d2e84164b44b2342aa5acc6d63cff36aac71cbce80a8c6fc8b8843",
    "after": "0f9aa7afe102feccf23de1ed53fac5fe8a76bad738fc3fda50a79016fa22006f",
    "count": 1
  }
];

const sha = (b) => "sha256:" + createHash("sha256").update(b).digest("hex");
const blob = (b) => createHash("sha1").update("blob " + b.length + "\0").update(b).digest("hex");
const utf8 = (b) => new TextDecoder("utf-8", { fatal: true }).decode(b);
const json = async (p) => JSON.parse(await readFile(p, "utf8"));
function within(parent, child) {
  const r = relative(parent, child);
  return r === "" || (!r.startsWith(".." + sep) && r !== ".." && !isAbsolute(r));
}
export function assertDisjoint(left, right, label) {
  assert.ok(!within(left, right) && !within(right, left), label + " roots overlap");
}
function git(root, ...argv) {
  const r = spawnSync("git", ["-C", root, ...argv], { encoding: "utf8", timeout: 30_000 });
  assert.equal(r.status, 0, "Git observation failed: " + argv.join(" "));
  return r.stdout;
}
function replaceExactly(text, before, after, count = 1) {
  assert.equal(text.split(before).length - 1, count, "Unexpected preimage: " + before.slice(0, 100));
  return text.split(before).join(after);
}
export function applyTextEdits(path, text, facts) {
  for (const edit of TEXT_EDITS.filter((x) => x.path === path)) {
    const after = edit.after.replaceAll("@@AUTHORITY@@", facts.authorityRevision)
      .replaceAll("@@RUN_URL@@", facts.runUrl);
    text = replaceExactly(text, edit.before, after, edit.count);
  }
  return text;
}
function sensitive(text) {
  return /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|https?:\/\/[^/\s]+:[^/\s]+@|Authorization:\s*(?:Bearer|Basic)\s+\S+|_authToken\s*[=:]\s*\S+)/i.test(text);
}
async function regular(root, name, limit = 1_048_576) {
  assert.ok(!isAbsolute(name) && name.split(/[\\/]/).every((p) => p !== ".." && p !== ""));
  const path = join(root, name), st = await lstat(path);
  assert.ok(st.isFile() && !st.isSymbolicLink(), "Not a regular selected file: " + name);
  assert.ok(st.size <= limit, "Selected file exceeds bounded export: " + name);
  assert.ok(within(root, await realpath(path)));
  const bytes = await readFile(path);
  assert.equal(bytes.length, st.size);
  return { bytes, mode: (st.mode & 0o111) ? "100755" : "100644", permissions: st.mode & 0o777 };
}
async function writeOwned(root, name, bytes, mode = "100644") {
  const path = join(root, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  await chmod(path, mode === "100755" ? 0o755 : 0o644);
}
function describe(path, bytes, mode = "100644") {
  return { path, bytes: bytes.length, sha256: sha(bytes), gitBlob: blob(bytes), mode };
}
function describeProof(path, observed) {
  return { path, bytes: observed.bytes.length, sha256: sha(observed.bytes),
    filesystemMode: observed.permissions.toString(8).padStart(4, "0") };
}
export function emitTextFrames(prefix, path, bytes, mode = "100644", emit = console.log) {
  assert.ok(bytes.length <= 1_048_576, "Framed text exceeds bounded per-file limit");
  assert.ok(!sensitive(utf8(bytes)), "Credential-like framed output refused: " + path);
  const item = describe(path, bytes, mode), encoded = bytes.toString("base64");
  const chunks = Math.ceil(encoded.length / 12_000);
  emit(prefix + "_FILE " + JSON.stringify({ ...item, chunks }));
  for (let index = 0; index < chunks; index++) {
    const line = prefix + "_CHUNK " + JSON.stringify({ path, index, total: chunks,
      base64: encoded.slice(index * 12_000, (index + 1) * 12_000) });
    assert.ok(Buffer.byteLength(line, "utf8") <= 16_384, "Framed log line exceeds 16 KiB");
    emit(line);
  }
  emit(prefix + "_END " + JSON.stringify({ path, sha256: item.sha256 }));
}
export function boundedCommandFailure(metadata, stdout, stderr) {
  const tail = (bytes) => {
    // Screen the entire stream before selecting a tail; cutting off a token's
    // prefix must not turn a detected credential into an apparently safe suffix.
    if (sensitive(bytes.toString("utf8"))) return { withheld: true, reason: "credential-like content" };
    const fromByte = Math.max(0, bytes.length - 8_000);
    return { withheld: false, fromByte, text: bytes.subarray(fromByte).toString("utf8") };
  };
  const safeMetadata = sensitive(JSON.stringify(metadata))
    ? { label: metadata.label, exitCode: metadata.exitCode, signal: metadata.signal,
        stdout: metadata.stdout, stderr: metadata.stderr, argumentsWithheld: true }
    : metadata;
  return { schemaVersion: 1, evidenceClass: "bounded-command-failure-diagnostic",
    metadata: safeMetadata, stdoutTail: tail(stdout), stderrTail: tail(stderr) };
}
export function reconcilePackage(host, source, target) {
  assert.equal(target.packageManager, "pnpm@11.20.0");
  assert.equal(target.engines.pnpm, "11.20.0");
  assert.equal(target.engines.node, ">=26.12.1 <27");
  assert.equal(host.engines.node, ">=24.21.0 <25 || >=26.0.0 <27");
  const result = structuredClone(host);
  result.packageManager = target.packageManager;
  result.engines.pnpm = target.engines.pnpm;
  result.engines.node = ">=24.22.3 <25 || >=26.12.1 <27";
  for (const key of DIRECT) {
    assert.equal(target.devDependencies[key], TUPLE[key]);
    result.devDependencies[key] = target.devDependencies[key];
  }
  for (const key of Object.keys(TUPLE).slice(0, 2)) assert.equal(result.devDependencies[key], undefined);
  for (const name of new Set([...Object.keys(source.scripts), ...Object.keys(target.scripts)])) {
    if (source.scripts[name] === target.scripts[name]) continue;
    assert.ok(name.startsWith("docs:"), "Unexpected controller script ownership: " + name);
    assert.equal(typeof target.scripts[name], "string");
    result.scripts[name] = target.scripts[name];
  }
  assert.equal(result.devDependencies["@agent-teams/feature-module-standard"], "0.4.3");
  assert.equal(result.devDependencies["stack-toolchain"], "0.3.1");
  assert.equal(result.scripts["foundation:check"], host.scripts["foundation:check"]);
  assert.equal(result.engines.node, ">=24.22.3 <25 || >=26.12.1 <27");
  return result;
}
export function reconcileWorkspace(host, target) {
  const start = target.indexOf("\nminimumReleaseAgeExclude:\n");
  assert.ok(start >= 0, "Missing generated release-age exception block");
  const block = target.slice(start + 1).split("\n").slice(1);
  const entries = [];
  for (const line of block) {
    if (line && !/^\s/.test(line)) break;
    const match = /^  - ["']?([^"']+)["']?\s*$/.exec(line);
    if (match) entries.push(match[1].trim());
  }
  for (const [name, version] of Object.entries(TUPLE)) {
    const selection = name + "@" + version;
    assert.equal(entries.filter((x) => x === selection).length, 1, "Unexpected generated selection: " + name);
    const candidates = host.split("\n").filter((line) => line.startsWith('  - "' + name + "@") && line.endsWith('"'));
    assert.equal(candidates.length, 1, "Unexpected Host selection: " + name);
    host = replaceExactly(host, candidates[0], '  - "' + selection + '"');
  }
  assert.ok(host.includes('  - "@agent-teams/feature-module-standard@0.4.3"'));
  assert.ok(host.includes('  - "stack-toolchain@0.3.1"') && host.includes("  bun: true"));
  assert.ok(host.includes("minimumReleaseAge: 0") && !host.includes("tooling-ts6"));
  return host;
}
function parseArgs(argv) {
  const keys = ["candidate", "target", "evidence", "controller", "node24", "node26", "corepack", "closure", "export"];
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    assert.ok(keys.includes(key) && !Object.hasOwn(args, key) && argv[i + 1], "Invalid helper argument");
    args[key] = resolve(argv[i + 1]);
  }
  assert.deepEqual(Object.keys(args).sort(), keys.sort());
  return args;
}
async function main() {
  assert.equal(process.env.GITHUB_ACTIONS, "true", "This helper executes only in its hosted qualification job");
  assert.equal(process.env.GITHUB_REPOSITORY, "agent-teams-ai/agent-teams-orchestrator");
  const selectedArchive = selectArchivedHostArgument(process.argv.slice(2));
  const args = parseArgs(selectedArchive.argv);
  for (const key of ["candidate", "target", "evidence", "controller", "node24", "node26", "corepack", "closure"]) {
    args[key] = await realpath(args[key]);
  }
  // The exclusive output does not exist yet; canonicalize its existing parent
  // before guarding it so a parent symlink cannot redirect writes into live roots.
  args.export = join(await realpath(dirname(args.export)), basename(args.export));
  const controllerRoot = await realpath(join(dirname(args.evidence), "controller"));
  assert.ok(within(controllerRoot, args.controller) && within(controllerRoot, args.corepack));
  for (const key of ["target", "evidence", "controller", "node24", "node26", "corepack", "closure", "export"]) {
    assertDisjoint(args.candidate, args[key], "Candidate and " + key);
  }
  assertDisjoint(args.candidate, controllerRoot, "Candidate and controller installation");
  for (const protectedRoot of [args.target, args.evidence, controllerRoot]) {
    assertDisjoint(args.export, protectedRoot, "Export and protected input");
  }
  assert.equal(git(args.candidate, "rev-parse", "HEAD").trim(), BASE);
  assert.equal(git(args.candidate, "status", "--porcelain=v1", "--untracked-files=all"), "");
  assert.equal(git(args.target, "rev-parse", SOURCE + "^{tree}").trim(), SOURCE_TREE);
  await mkdir(args.export, { recursive: false });
  const commandsRoot = join(args.export, "commands");
  await mkdir(commandsRoot);
  const archive = await validateArchivedHostInput({ archivePath: selectedArchive.path,
    evidenceRoot: args.evidence, targetRoot: args.target, candidateRoot: args.candidate, outputRoot: args.export });
  const summary = await json(join(args.evidence, "summary.json"));
  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.scope, "physical-managed-lifecycle");
  assert.equal(summary.outcome, "passed");
  assert.equal(summary.source.revision, SOURCE);
  assert.equal(summary.source.tree, SOURCE_TREE);
  if (archive === undefined) {
    assert.equal(summary.source.consumer.root, args.target);
    const rootStat = await lstat(args.target, { bigint: true });
    assert.equal(summary.source.consumer.device, String(rootStat.dev));
    assert.equal(summary.source.consumer.inode, String(rootStat.ino));
    assert.equal(summary.source.consumer.birthtimeNs, String(rootStat.birthtimeNs));
  } else assert.deepEqual(summary.source.consumer, archive.sourceConsumer);
  assert.match(summary.authorityRevision, /^[0-9a-f]{40}$/);
  assert.equal(summary.run.repository, process.env.GITHUB_REPOSITORY);
  assert.equal(String(summary.run.runId), archive?.physicalRun.runId ?? process.env.GITHUB_RUN_ID);
  assert.equal(String(summary.run.runAttempt), archive?.physicalRun.runAttempt ?? process.env.GITHUB_RUN_ATTEMPT);
  const runUrl = "https://github.com/" + summary.run.repository + "/actions/runs/" +
    summary.run.runId + "/attempts/" + summary.run.runAttempt;
  const targetAssets = await json(join(args.evidence, "managed-assets-manifest.json"));
  assert.deepEqual(targetAssets.map((x) => x.path), ASSETS);
  assert.deepEqual(summary.assets, targetAssets);
  for (const item of targetAssets) {
    const actual = await regular(args.target, item.path);
    assert.deepEqual(describe(item.path, actual.bytes, actual.mode), item);
    const retained = await regular(join(args.evidence, "managed-assets"), item.path);
    assert.ok(retained.bytes.equals(actual.bytes), "Retained target copy drifted");
  }
  const profile = await json(join(args.target, "architecture/foundation/docs-consumer-integration.json"));
  const state = await json(join(args.target, "architecture/foundation/docs-protocol-managed-state.json"));
  assert.equal(profile.schemaVersion, 4);
  assert.equal(profile.cohort.cohortId, COHORT);
  assert.equal(profile.cohort.recordDigest, RECORD);
  assert.equal(state.schemaVersion, 3);
  assert.equal(state.cohortId, COHORT);
  assert.equal((await readFile(join(args.target, ".node-version"), "utf8")).trim(), INPUT_BINDING.runtime.targetPin.trim());
  assert.equal(targetAssets.find((x) => x.path === "pnpm-lock.yaml").sha256, INPUT_BINDING.selectedLock.sha256);
  const observations = {};
  const retainedOutputs = [];
  for (const label of LABELS) {
    const meta = await json(join(args.evidence, "commands", label + ".meta.json"));
    assert.equal(meta.label, label);
    if (label.endsWith("-prepare")) {
      const targetLockArg = meta.argv.indexOf("--target-lockfile-sha256");
      assert.ok(targetLockArg >= 0);
      assert.equal(meta.argv[targetLockArg + 1], INPUT_BINDING.selectedLock.sha256);
    }
    const ci = meta.argv.indexOf("--consumer");
    assert.ok(ci >= 0 && meta.argv[ci + 1] === (archive?.sourceRoot ?? args.target));
    assert.ok(Number.isInteger(meta.exitCode));
    assert.ok(label === "A-fault" ? meta.exitCode !== 0 : meta.exitCode === 0);
    for (const [suffix, saved] of [["stdout.json", "stdout.json"], ["stderr.log", "stderr.txt"], ["meta.json", "meta.json"]]) {
      const original = await regular(args.evidence, "commands/" + label + "." + suffix);
      assert.ok(!sensitive(utf8(original.bytes)), "Credential-like evidence refused: " + label);
      const path = "commands/" + label + "." + saved;
      await writeOwned(args.candidate, EVIDENCE_PATH + "/" + path, original.bytes);
      retainedOutputs.push(describe(path, original.bytes));
    }
    const stdout = await readFile(join(args.evidence, "commands", label + ".stdout.json"), "utf8");
    if (label === "A-fault") {
      const stderr = await readFile(join(args.evidence, "commands", label + ".stderr.log"), "utf8");
      assert.ok((stdout + stderr).includes("EACCES"));
      assert.equal(meta.exitCode, summary.phases.A.faultExitCode);
    } else observations[label] = JSON.parse(stdout);
  }
  for (const [label, actual] of [["A-resume", summary.phases.A.resume], ["A-restore", summary.phases.A.restore],
    ["B-finalize", summary.phases.B.finalize], ["B-committed-restore", summary.phases.B.committedRestore],
    ["C-finalize", summary.phases.C.finalize]]) assert.deepEqual(observations[label], actual);
  for (const [label, receipt] of [["A-resume", "already-satisfied"], ["B-finalize", "applied"], ["C-finalize", "applied"]]) {
    assert.equal(observations[label].outcome, "upgraded");
    assert.equal(observations[label].receipt.outcome, receipt);
    assert.deepEqual(observations[label].issues, []);
  }
  for (const label of ["A-restore", "B-committed-restore"]) {
    assert.equal(observations[label].outcome, "restored");
    assert.deepEqual(observations[label].issues, []);
  }
  const proofDigests = [];
  for (const phase of ["A", "B", "C"]) {
    const prepPath = "proofs/" + phase + "/completion.json.prepared";
    const prepObservation = await regular(args.evidence, prepPath, 16_777_216);
    const prepBytes = prepObservation.bytes;
    const prep = JSON.parse(utf8(prepBytes));
    assert.equal(sha(prepBytes), summary.phases[phase].preparationDigest);
    assert.equal(prep.plan.planDigest, summary.phases[phase].planDigest);
    assert.equal(prep.sourceRevision, SOURCE);
    assert.equal(prep.plan.operations.length, 7);
    assert.deepEqual(prep.plan.operations.map((x) => x.path).sort(), ASSETS);
    assert.equal(prep.consumer.root, archive?.sourceRoot ?? args.target);
    assert.equal(observations[phase + "-prepare"].outcome, "prepared");
    assert.equal(observations[phase + "-prepare"].preparation.digest, sha(prepBytes));
    proofDigests.push(describeProof(prepPath, prepObservation));
    for (const suffix of ["", ".receipt"]) {
      const name = "proofs/" + phase + "/completion.json" + suffix;
      proofDigests.push(describeProof(name, await regular(args.evidence, name, 16_777_216)));
    }
  }
  const selectionPath = "proofs/B/current-selection.json";
  const selection = await regular(args.evidence, selectionPath, 16_777_216);
  assert.equal(sha(selection.bytes), summary.phases.B.selectionDigest);
  proofDigests.push(describeProof(selectionPath, selection));
  assert.equal(summary.phases.A.inventoryRestored, true);
  assert.equal(summary.phases.B.inventoryRestored, true);
  const contractPath = "architecture/foundation/required-quality-tests.json";
  assert.equal(sha(await readFile(join(args.candidate, contractPath))), "sha256:" + REQUIRED_HASH);
  for (const name of FULL_ASSETS) {
    const item = targetAssets.find((x) => x.path === name);
    await writeOwned(args.candidate, name, (await regular(args.target, name)).bytes, item.mode);
  }
  const hostPackage = await json(join(args.candidate, "package.json"));
  const sourcePackage = JSON.parse(git(args.target, "show", SOURCE + ":package.json"));
  const targetPackage = await json(join(args.target, "package.json"));
  const hostEngine = ">=24.22.3 <25 || >=26.12.1 <27";
  await writeOwned(args.candidate, "package.json", JSON.stringify(reconcilePackage(hostPackage, sourcePackage, targetPackage), null, 2) + "\n");
  await writeOwned(args.candidate, "pnpm-workspace.yaml", reconcileWorkspace(
    await readFile(join(args.candidate, "pnpm-workspace.yaml"), "utf8"),
    await readFile(join(args.target, "pnpm-workspace.yaml"), "utf8")));
  const isDocument = (path) => path === "AGENTS.md" || path.startsWith("docs/");
  async function editSelectedDocuments(documents) {
    for (const path of new Set(TEXT_EDITS.map((x) => x.path).filter((path) => isDocument(path) === documents))) {
      const before = await readFile(join(args.candidate, path), "utf8");
      await writeOwned(args.candidate, path, applyTextEdits(path, before, { authorityRevision: summary.authorityRevision, runUrl }));
    }
  }
  await editSelectedDocuments(false);
  assert.equal(sha(await readFile(join(args.candidate, contractPath))), "sha256:" + REQUIRED_HASH);
  const shimDir = join(args.export, "bin");
  await mkdir(shimDir);
  const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
  await writeOwned(shimDir, "pnpm", "#!/bin/sh\nexec " + quote(args.node26) + " " + quote(args.corepack) + ' pnpm "$@"\n', "100755");
  const env = { ...process.env, PATH: shimDir + ":" + dirname(args.node26) + ":" + process.env.PATH,
    COREPACK_ENABLE_NETWORK: "1", COREPACK_ENABLE_DOWNLOAD_PROMPT: "0", COREPACK_DEFAULT_TO_LATEST: "0" };
  delete env.NODE_OPTIONS; delete env.NODE_PATH;
  delete env.GITHUB_TOKEN; delete env.GH_TOKEN; delete env.CENTRAL_READ_TOKEN;
  const ownResults = [];
  async function run(label, executable, argv, timeout = 1_200_000) {
    const out = join(commandsRoot, label + ".stdout.txt"), err = join(commandsRoot, label + ".stderr.txt");
    const stdout = openSync(out, "wx"), stderr = openSync(err, "wx");
    const startedAt = new Date().toISOString();
    let result;
    try { result = spawnSync(executable, argv, { cwd: args.candidate, env, stdio: ["ignore", stdout, stderr], timeout }); }
    finally { closeSync(stdout); closeSync(stderr); }
    const stdoutBytes = await readFile(out), stderrBytes = await readFile(err);
    const item = { label, argv: [executable, ...argv], cwd: args.candidate, startedAt,
      completedAt: new Date().toISOString(), exitCode: result.status, signal: result.signal ?? null,
      executionError: result.error ? { name: result.error.name, code: result.error.code, message: result.error.message } : null,
      stdout: describe(label + ".stdout.txt", stdoutBytes), stderr: describe(label + ".stderr.txt", stderrBytes) };
    ownResults.push(item);
    await writeFile(join(commandsRoot, label + ".meta.json"), JSON.stringify(item, null, 2) + "\n", { flag: "wx" });
    if (result.status !== 0) {
      const failure = boundedCommandFailure(item, stdoutBytes, stderrBytes);
      const failureBytes = Buffer.from(JSON.stringify(failure, null, 2) + "\n", "utf8");
      await writeFile(join(commandsRoot, label + ".failure.json"), failureBytes, { flag: "wx" });
      emitTextFrames("ORCHESTRATOR_HOST_FAILURE", "commands/" + label + ".failure.json", failureBytes);
    }
    assert.equal(result.status, 0, "Host command failed: " + label + " (see retained command output)");
    return stdoutBytes.toString("utf8");
  }
  const pnpm = (label, argv, timeout) => run(label, args.node26, [args.corepack, "pnpm", ...argv], timeout);
  assert.equal((await run("node26-version", args.node26, ["--version"])).trim(), "v26.12.1");
  assert.equal((await run("node24-version", args.node24, ["--version"])).trim(), "v24.22.3");
  assert.equal((await pnpm("pnpm-version", ["--version"])).trim(), "11.20.0");
  await pnpm("lock-generation", ["install", "--lockfile-only", "--ignore-scripts", "--config.engine-strict=true", "--strict-peer-dependencies"]);

  const closureInput = await regular(dirname(args.closure), basename(args.closure), 2_097_152);
  assert.equal(sha(closureInput.bytes), INPUT_BINDING.target.closure.digest);
  const yamlEntry = await realpath(createRequire(args.controller).resolve("yaml"));
  assert.ok(within(controllerRoot, yamlEntry), "YAML parser must come from the retained controller installation");
  const yaml = await import(pathToFileURL(yamlEntry).href);
  const initialHostLock = await regular(args.candidate, "pnpm-lock.yaml");
  let lockDraft = createSelectedLockDraft({ sourceLockBytes: initialHostLock.bytes,
    closureBytes: closureInput.bytes, expectedClosureDigest: INPUT_BINDING.target.closure.digest,
    yaml, mode: "construct" });
  let foreignDependencyRefresh = null;
  async function hostForeignInventory() {
    const paths = [...new Set(git(args.candidate, "ls-files", "--cached", "--others", "--exclude-standard", "-z")
      .split("\0").filter((path) => path && path !== "pnpm-lock.yaml"))].sort();
    const rows = [];
    for (const path of paths) {
      const file = await regular(args.candidate, path);
      rows.push({ ...describe(path, file.bytes, file.mode), filesystemMode: file.permissions });
    }
    const pending = [args.candidate];
    let visited = 0;
    while (pending.length) {
      const directory = pending.pop();
      assert.ok(++visited <= 10_000, "Candidate directory inventory exceeded its bound");
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name === ".git") continue;
        assert.notEqual(entry.name, "node_modules", "Lock-only refresh must not materialize a workspace installation");
        if (entry.isDirectory()) pending.push(join(directory, entry.name));
      }
    }
    return rows;
  }
  const refreshedNames = new Set();
  for (let pass = 1; lockDraft.report.collisions.length && pass <= 2; pass += 1) {
    const collisions = lockDraft.report.collisions;
    const names = new Set();
    const targetClosure = JSON.parse(utf8(closureInput.bytes));
    for (const collision of collisions) {
      assert.equal(collision.kind, "snapshot", "Only observed dependency-edge conflicts permit a package-manager refresh");
      assert.equal(collision.foreignReachable, true);
      for (const difference of collision.differences) {
        const match = /^(?:dependencies|optionalDependencies)\.(.+)$/.exec(difference.path);
        assert.ok(match && typeof difference.before === "string" && typeof difference.after === "string",
          "Non-dependency snapshot changes require explicit review");
        const name = match[1];
        assert.match(name, /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/);
        const version = difference.after.split("(", 1)[0];
        assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
        assert.ok(Object.hasOwn(targetClosure.pnpmLock.packages, name + "@" + version),
          "Refresh destination must exist in the actual canonical closure");
        names.add(name);
      }
    }
    assert.ok(names.size > 0, "Refresh selection must be nonempty");
    for (const name of names) {
      assert.ok(!refreshedNames.has(name), "Repeated unresolved refresh selection requires explicit review: " + name);
      refreshedNames.add(name);
    }
    assert.ok(refreshedNames.size <= 8, "Cumulative refresh selection must remain bounded");
    const protectedDiff = git(args.candidate, "diff", "--binary", "HEAD", "--", ".", ":(exclude)pnpm-lock.yaml");
    const protectedUntracked = git(args.candidate, "ls-files", "--others", "--exclude-standard", "-z");
    const protectedInventory = await hostForeignInventory();
    const beforeRefresh = await regular(args.candidate, "pnpm-lock.yaml");
    const selectors = [...names].sort();
    const command = "host-transitive-lock-refresh-" + pass;
    await writeFile(join(commandsRoot, command + ".before-report.json"), JSON.stringify(lockDraft.report, null, 2) + "\n", { flag: "wx" });
    await pnpm(command, ["update", "--recursive", "--include-workspace-root", ...selectors, "--depth", "Infinity",
      "--no-save", "--lockfile-only", "--no-changeset", "--ignore-scripts", "--ignore-pnpmfile",
      "--engine-strict", "--config.strict-peer-dependencies=true", "--config.frozen-lockfile=false",
      "--config.prefer-frozen-lockfile=false", "--config.verify-store-integrity=true"]);
    assert.equal(git(args.candidate, "diff", "--binary", "HEAD", "--", ".", ":(exclude)pnpm-lock.yaml"), protectedDiff);
    assert.equal(git(args.candidate, "ls-files", "--others", "--exclude-standard", "-z"), protectedUntracked);
    assert.deepEqual(await hostForeignInventory(), protectedInventory,
      "Dependency refresh changed non-lock candidate bytes or modes");
    const refreshed = await regular(args.candidate, "pnpm-lock.yaml");
    foreignDependencyRefresh ??= { maxPasses: 2, passes: [] };
    foreignDependencyRefresh.passes.push({ pass, selectors, before: describe("pnpm-lock.yaml", beforeRefresh.bytes),
      after: describe("pnpm-lock.yaml", refreshed.bytes), command });
    lockDraft = createSelectedLockDraft({ sourceLockBytes: refreshed.bytes,
      closureBytes: closureInput.bytes, expectedClosureDigest: INPUT_BINDING.target.closure.digest,
      yaml, mode: "construct" });
    await writeFile(join(commandsRoot, command + ".after-report.json"), JSON.stringify(lockDraft.report, null, 2) + "\n", { flag: "wx" });
  }
  await writeFile(join(commandsRoot, "host-selected-lock-report.json"), JSON.stringify(lockDraft.report, null, 2) + "\n", { flag: "wx" });
  if (lockDraft.report.outcome !== "constructed-unadmitted" || lockDraft.report.collisions.length || !lockDraft.bytes) {
    emitTextFrames("ORCHESTRATOR_HOST_FAILURE", "commands/host-selected-lock-report.json",
      Buffer.from(JSON.stringify(lockDraft.report, null, 2) + "\n"));
    throw new Error("Host selected lock construction refused; canonical closure and foreign projection remain enforced");
  }
  await writeOwned(args.candidate, "pnpm-lock.yaml", lockDraft.bytes);
  const selectedHostLock = describe("pnpm-lock.yaml", lockDraft.bytes);
  if (archive !== undefined) assert.equal(selectedHostLock.sha256,
    "sha256:4ad19563e9694e5d1cf6d65c2c81141cc38f1661b655b79b765da8c2ee6789ff", "Archived Host lock reproduction changed");
  await pnpm("frozen-install", ["install", "--frozen-lockfile", "--config.engine-strict=true", "--strict-peer-dependencies"]);
  assert.equal(sha((await regular(args.candidate, "pnpm-lock.yaml")).bytes), selectedHostLock.sha256,
    "Frozen installation changed the selected Host lock");
  await pnpm("installed-peers", ["peers", "check"]);
  await pnpm("docs-info", ["docs:info"]);
  await pnpm("docs-find", ["docs:find", "--", "--text", "repository tooling"]);
  const docsInfo = (await json(join(args.candidate, "package.json"))).scripts["docs:info"];
  const docsSelection = /^agent-teams-docs info --consumer (\S+) --profile (\S+)$/.exec(docsInfo);
  assert.ok(docsSelection, "Docs context must use the exact installed docs:info selection");
  await pnpm("docs-context", ["exec", "docs-protocol", "context", "--consumer", docsSelection[1],
    "--profile", docsSelection[2], "--max-documents", "8", "--max-bytes", "32768"]);
  await editSelectedDocuments(true);
  const manifest = {
    schemaVersion: 1, evidenceClass: "inert-hosted-managed-lifecycle-observation", authority: false, replayable: false,
    run: archive === undefined
      ? { ...summary.run, url: runUrl, workflowCommit: process.env.GITHUB_SHA, workflowRef: process.env.GITHUB_WORKFLOW_REF }
      : { ...summary.run, url: runUrl, workflowCommit: archive.physicalRun.headSha, workflowPath: archive.physicalRun.workflowPath },
    source: summary.source, originalMainRevision: INPUT_BINDING.originalMainRevision,
    selectedTargetLock: summary.selectedTargetLock, harnessInputBindingSha256: summary.harnessInputBindingSha256,
    sourcePrerequisite: INPUT_BINDING.sourceAdmission ?? null, selectedPhysicalLock: INPUT_BINDING.selectedLock,
    authorityRevision: summary.authorityRevision,
    controller: summary.controller, kernel: summary.kernel, runtimes: summary.runtimes, phases: summary.phases,
    physicalTargetFiles: targetAssets, retainedOutputs, externalProofDigests: proofDigests,
    hostReconciliation: { baseCommit: BASE, physicalNodeEngine: targetPackage.engines.node, hostNodeEngine: hostEngine,
      ...(archive === undefined ? {} : { archiveInput: archive, hostRun: {
        repository: process.env.GITHUB_REPOSITORY, runId: process.env.GITHUB_RUN_ID,
        runAttempt: process.env.GITHUB_RUN_ATTEMPT, headSha: process.env.GITHUB_SHA,
        workflowRef: process.env.GITHUB_WORKFLOW_REF } }),
      defaultNode: "26.12.1", pnpm: "11.20.0", foundation: "4.0.3", fms: "0.4.3", stack: "0.3.1",
      derivedFields: ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"],
      selectedHostLock, foreignDependencyRefresh, canonicalRuntimeClosureDigest: INPUT_BINDING.target.closure.digest,
      generatedAssetsPreserved: FULL_ASSETS, mandatoryQualityContractSha256: "sha256:" + REQUIRED_HASH },
    remaining: ["final published PR head CI", "resulting main CI", "central observed binding and CANARY"],
    limitations: ["No unavailable-local-environment execution is claimed.", "Archived proof copies are not live authority."]
  };
  await writeOwned(args.candidate, EVIDENCE_PATH + "/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
  const checked = JSON.parse(await run("managed-check", args.node26, [args.controller, "check", "--consumer", args.candidate, "--json"]));
  assert.equal(checked.outcome, "current");
  assert.deepEqual(checked.issues, []);
  await pnpm("docs-check", ["docs:check"]);
  await pnpm("docs-protocol-check", ["docs:protocol:check"]);
  for (const name of FULL_ASSETS) {
    assert.equal(sha(await readFile(join(args.candidate, name))), targetAssets.find((x) => x.path === name).sha256);
  }
  assert.equal(sha(await readFile(join(args.candidate, contractPath))), "sha256:" + REQUIRED_HASH);
  const finalPackage = await json(join(args.candidate, "package.json"));
  assert.deepEqual(finalPackage, reconcilePackage(hostPackage, sourcePackage, targetPackage));
  for (const item of targetAssets) assert.equal(sha(await readFile(join(args.target, item.path))), item.sha256);
  const changed = [...new Set([
    ...git(args.candidate, "diff", "--name-only", "-z", "HEAD").split("\0"),
    ...git(args.candidate, "ls-files", "--others", "--exclude-standard", "-z").split("\0"),
  ].filter(Boolean))].sort();
  const allowed = new Set([...ASSETS, ...TEXT_EDITS.map((x) => x.path), EVIDENCE_PATH + "/manifest.json",
    ...retainedOutputs.map((x) => EVIDENCE_PATH + "/" + x.path)]);
  assert.ok(changed.every((path) => allowed.has(path)), "Unexpected candidate file outside the reviewed allowlist");
  const files = [];
  let total = 0;
  for (const path of changed) {
    const { bytes, mode } = await regular(args.candidate, path);
    assert.ok(!sensitive(utf8(bytes)), "Credential-like candidate output refused: " + path);
    total += bytes.length;
    assert.ok(total <= 8_388_608, "Candidate export exceeds bounded total");
    const item = describe(path, bytes, mode);
    await writeOwned(args.export, "files/" + path, bytes, mode);
    files.push(item);
    emitTextFrames("ORCHESTRATOR_HOST", path, bytes, mode);
  }
  const result = { schemaVersion: 1, scope: "derived-host-integration", outcome: "passed", parentCommit: BASE,
    physicalSourceRevision: SOURCE, physicalTargetFiles: targetAssets, files, commands: ownResults,
    ...(archive === undefined ? {} : { archivedPhysicalInput: archive, hostRun: {
      repository: process.env.GITHUB_REPOSITORY, runId: process.env.GITHUB_RUN_ID,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT, headSha: process.env.GITHUB_SHA } }),
    managedCheck: checked, candidateCommitCreated: false, finalPublishedHeadQualified: false,
    node24CompatibilityQualified: false, productionIAMLifecycleQualified: false };
  const resultBytes = Buffer.from(JSON.stringify(result, null, 2) + "\n", "utf8");
  assert.ok(resultBytes.length <= 1_048_576 && !sensitive(utf8(resultBytes)));
  await writeFile(join(args.export, "integration-run.json"), resultBytes, { flag: "wx" });
  emitTextFrames("ORCHESTRATOR_HOST_EVIDENCE", "integration-run.json", resultBytes);
  console.log("ORCHESTRATOR_HOST_RESULT " + JSON.stringify({ schemaVersion: 1, scope: result.scope,
    outcome: result.outcome, parentCommit: BASE, physicalSourceRevision: SOURCE, fileCount: files.length,
    fileBytes: total, detail: describe("integration-run.json", resultBytes), candidateCommitCreated: false,
    finalPublishedHeadQualified: false, node24CompatibilityQualified: false, productionIAMLifecycleQualified: false }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

