// Local preparation only. No Git writes, network calls, refs, PRs, or workflow runs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  TARGET, TARGET_TUPLE, SOURCE_REF, SOURCE_CONTEXT, CANARY_WORKFLOW, CANARY_REFS,
  canaryWorkflowDefinition, assertCanaryWorkflow, parseCompleteTree, assertSourceTuple,
} from './authorization-source-v10/scripts/runtime-admission-source-successor-v10.ts';

const source = path.join(import.meta.dirname, 'authorization-source-v10');
const output = path.join(import.meta.dirname, 'authorization-v10-canary-preparation');
const sourceSHA = '92530dc46b7f5fc0c89760bdaff5e28b6563a603';
const sourceTree = '20c3cd43b1d5be84a4b8a4c9986f16f91d748ed5';
const require = createRequire(path.join(source, 'package.json'));
const { stringify } = require('yaml');
const git = (...args) => execFileSync('git', ['-C', source, ...args]);
const hash = (kind, bytes) => createHash('sha1').update(`${kind} ${bytes.length}\0`).update(bytes).digest('hex');
const sha = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const raw = (revision, file) => git('show', `${revision}:${file}`);
const write = (relative, bytes) => {
  const dest = path.join(output, relative);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, bytes, { flag: 'wx', mode: 0o644 });
  return { localPath: dest, bytes: bytes.length, sha256: sha(bytes), gitBlob: hash('blob', bytes), mode: '100644' };
};
assert.equal(git('rev-parse', 'HEAD^{tree}').toString().trim(), sourceTree);
assert.equal(git('status', '--porcelain').toString(), '');
assert.equal(TARGET.pullRequest, 467);
assert.equal(TARGET.headSHA, '611cd2a78d1f9104dbf46bab69c3ff0e30ac6d8f');
assert.equal(TARGET.baseSHA, 'd167b2360524474240a43e3ff70e35eb94e109c7');
assert.equal(git('rev-parse', `${TARGET.baseSHA}^{tree}`).toString().trim(), TARGET.baseTreeSHA);
assert.equal(git('rev-parse', `${TARGET.headSHA}^{tree}`).toString().trim(), TARGET.headTreeSHA);
for (const [file, before, after] of TARGET_TUPLE) {
  assert.equal(hash('blob', raw(TARGET.baseSHA, file)), before);
  assert.equal(hash('blob', raw(TARGET.headSHA, file)), after);
}
const caller = Buffer.from(stringify(canaryWorkflowDefinition(sourceSHA)));
await assertCanaryWorkflow(caller, sourceSHA);
mkdirSync(output); // Exclusive output directory; a previous preparation is never overwritten.
const callerDescriptor = write('stage-2-caller/' + CANARY_WORKFLOW, caller);
const receipt = 'scripts/verify-docs-cohort-v2-receipt.mjs';
const test = 'scripts/verify-docs-consumer-gate.test.mjs';
const extra = 'scripts/verify-docs-admission-change.mjs';
const payloads = [
  {
    name: 'positive', ref: CANARY_REFS[0], expected: 'noop',
    reason: 'Ordinary README edit and exact inputless caller remain admissible through frozen V4. This is not the PR467 finite exception.',
    files: new Map([['README.md', Buffer.concat([raw(TARGET.baseSHA, 'README.md'), Buffer.from('\nRuntime admission V10 positive canary: ordinary documentation changes remain admissible.\n')])]]),
  },
  {
    name: 'wrong-blob', ref: CANARY_REFS[1], expected: 'rejected',
    reason: 'Protected receipt lookalike: exact repaired test plus a receipt blob that differs from PR467. Separate PR/head cannot select the finite exception; frozen V4 rejects the protected source change.',
    files: new Map([[receipt, Buffer.concat([raw(TARGET.headSHA, receipt), Buffer.from('\n// V10 negative canary: this receipt blob is outside the exact PR467 tuple.\n')])], [test, raw(TARGET.headSHA, test)]]),
  },
  {
    name: 'extra-file', ref: CANARY_REFS[2], expected: 'rejected',
    reason: 'Exact PR467 repaired blobs plus one extra protected admission source change. Separate PR/head cannot select the finite exception; frozen V4 rejects the protected source changes. The tuple predicate independently rejects an extra declared file.',
    files: new Map([[receipt, raw(TARGET.headSHA, receipt)], [test, raw(TARGET.headSHA, test)], [extra, Buffer.concat([raw(TARGET.baseSHA, extra), Buffer.from('\n// V10 negative canary: extra protected admission source is outside PR467.\n')])]]),
  },
];
const prepared = payloads.map(p => ({
  name: p.name, ref: p.ref, base: TARGET.baseSHA, baseTree: TARGET.baseTreeSHA,
  expectedDecision: p.expected, expectedReason: p.reason,
  stage1: [...p.files].map(([file, bytes]) => ({ path: file, before: hash('blob', raw(TARGET.baseSHA, file)), ...write(`stage-1-${p.name}/${file}`, bytes) })),
  stage2: [{ path: CANARY_WORKFLOW, before: null, ...callerDescriptor }],
  future: { pullRequest: null, head: null, run: null, outcome: null },
}));

// Use exact existing Git trees for a narrow local contract check. These are not hosted evidence.
function completeTree(revision) {
  const tree = git('ls-tree', '-r', '-t', '-z', '--long', revision).toString().split('\0').filter(Boolean).map(row => {
    const [info, filename] = row.split('\t');
    const [mode, type, objectSHA, size] = info.trim().split(/\s+/u);
    return { path: filename, mode, type, sha: objectSHA, ...(size === '-' ? {} : { size: Number(size) }) };
  });
  const treeSHA = git('rev-parse', `${revision}^{tree}`).toString().trim();
  return parseCompleteTree({ sha: treeSHA, truncated: false, tree }, treeSHA);
}
const baseTree = completeTree(TARGET.baseSHA), headTree = completeTree(TARGET.headSHA);
const exactFiles = TARGET_TUPLE.map(([filename, before, after]) => ({ filename, status: before === null ? 'added' : 'modified', sha: after }));
assertSourceTuple(baseTree, headTree, [exactFiles]);
const wrongFiles = exactFiles.map(file => file.filename === receipt ? { ...file, sha: prepared[1].stage1.find(f => f.path === receipt).gitBlob } : file);
assert.throws(() => assertSourceTuple(baseTree, headTree, [wrongFiles]), /Changed-file blob drift/u);
const extraFile = prepared[2].stage1.find(file => file.path === extra);
assert.throws(() => assertSourceTuple(baseTree, headTree, [[...exactFiles, { filename: extra, status: 'modified', sha: extraFile.gitBlob }]]), /Incomplete quality source file count/u);
const manifest = {
  schemaVersion: 1, purpose: 'local-canary-payload-preparation', qualificationAuthority: false,
  source: { revision: sourceSHA, tree: sourceTree, ref: SOURCE_REF, context: SOURCE_CONTEXT, publication: 'non-authoritative-preparation-branch', preparationRef: 'refs/heads/work/iam-authorization-source-v10-20261127', preparationBranchProtected: false, sourceBranchObservedPublished: false, stagingLockObservedSaved: false, hostedQualification: null },
  boundPositiveTarget: { pullRequest: TARGET.pullRequest, head: TARGET.headSHA, base: TARGET.baseSHA, route: 'protected source push only', expectedDecision: 'bounded-docs-authorization-digest-repair', actualRun: null },
  canaries: prepared,
  localContractChecks: { canonicalInputlessCaller: 'passed', actualPR467Tuple: 'passed', wrongBlobMetadata: 'rejected: Changed-file blob drift', extraFileMetadata: 'rejected: Incomplete quality source file count', scope: 'pure local checks only; no live GitHub execution or admission claimed' },
  publicationOrder: ['First protect and publish source ref, then verify real source qualification.', 'For each canary create stage1 commit from exact current d167 main, create its branch and Ready same-repository PR with canonical identity.', 'Only then append the stage2 caller to that branch; this triggers a push with a discoverable open PR.', 'Read actual source/qualify/publisher jobs and final App15368 status at exact canary head. Fill future coordinates only from live observations.', 'Recheck required rules and normal merge refusal for both negative canaries before any protected transition.'],
  limitations: ['No source branch, lock, refs, PRs, runs, or settings changed by this preparation.', 'Negative canary PRs use the frozen ordinary rejection route, not the exact bound PR467 positive route.', 'Do not merge the negative canaries or promote their payloads into main.', 'If Central main or actual PR467 moves, stop and reassess instead of silently rebasing finite bindings.'],
};
const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
const result = write('manifest.json', bytes);
console.log(JSON.stringify({ output, manifest: result, caller: callerDescriptor, canaries: prepared.map(p => ({ name: p.name, ref: p.ref, stage1: p.stage1.map(f => ({ path: f.path, gitBlob: f.gitBlob })), expected: p.expectedDecision })) }));
