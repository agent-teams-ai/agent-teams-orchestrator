from pathlib import Path
import hashlib

task = Path("/workspace/scratch/e36de90adcfd/iam-e2e-resume-20261127")
original = task / "harness-v3-preparation/generated-final-d167/hosted-fallback/orchestrator-managed-lifecycle.sh"
raw = original.read_bytes()
assert hashlib.sha256(raw).hexdigest() == "4b603b514e0525bc0e0e4aa1fe162897f856c401bcd22f0ca89f6ffd54702dfa"
text = raw.decode()
prefix, observer_rest = text.split('cat > "$ROOT/observe.py" <<\'PY\'\n', 1)
observer = observer_rest.split("\nPY\nobserve()", 1)[0]

def once(source, before, after):
    assert source.count(before) == 1, (before, source.count(before))
    return source.replace(before, after)

prefix = prefix.replace("docs-2026-11-27-orchestrator-v3", "docs-2026-11-27-orchestrator-v4")
prefix = once(prefix, "# Disposable physical qualification. No owner receipt or authority is fabricated.",
              "# Fresh public generation-2-to-3 forward only. Historical v3 recovery is separate evidence.")
prefix = once(prefix,
    'test "$(sha256sum "$E2E_HARNESS_INPUT_BINDING" | cut -d\' \' -f1)" = "b8e476f1713a623526c3e9560966761c873f7ac601c1753a4d49e6d5a91bcfdb"',
    'test "$(sha256sum "$E2E_HARNESS_INPUT_BINDING" | cut -d\' \' -f1)" = "$E2E_HARNESS_INPUT_BINDING_SHA256"')
prefix = once(prefix,
    'mkdir -m 700 "$EVID/proofs" "$EVID/proofs/A" "$EVID/proofs/B" "$EVID/proofs/C"\nA="$EVID/proofs/A/completion.json"\nB="$EVID/proofs/B/completion.json"\nC="$EVID/proofs/C/completion.json"\ntrap \'chmod 700 "$EVID/proofs/A" 2>/dev/null || true\' EXIT',
    'mkdir -m 700 "$EVID/proofs" "$EVID/proofs/forward"\nFORWARD="$EVID/proofs/forward/completion.json"')
prefix = once(prefix, 'export AUTHORITY\n',
    'test "$AUTHORITY" = "$(jq -er .authoritySnapshotRevision "$E2E_HARNESS_INPUT_BINDING")"\nexport AUTHORITY\n')
prefix = once(prefix, "jq -e '\n  [.cohorts[]",
    """jq -e \\
  --arg record "$(jq -er .target.recordDigest "$E2E_HARNESS_INPUT_BINDING")" \\
  --arg event "$(jq -er .target.qualificationEventDigest "$E2E_HARNESS_INPUT_BINDING")" \\
  --arg workflow "$(jq -er .target.workflow.revision "$E2E_HARNESS_INPUT_BINDING")" \\
  --arg blob "$(jq -er .target.workflow.blobSha "$E2E_HARNESS_INPUT_BINDING")" '\n  [.cohorts[]""")
prefix = once(prefix, '=="sha256:f61e98c96fcc7beab30b6956312dead50a363c403fd67cdce4d0f18e8e69424c"', '==$record')
prefix = once(prefix, '=="sha256:4451ea715ef68048c01e182fe4755acc4639d7d2e106e536e2b240834e7084c0"', '==$event')
prefix = once(prefix, '=="997f24396598f93cf1b03bb26436a5ec7686ddef"', '==$workflow')
prefix = once(prefix, '=="714af12998ef140dd55a2ec3057f67775586cfd7"', '==$blob')

helpers, actions = observer.split("action=sys.argv[1]\n", 1)
helpers = once(helpers,
    'harnessInputBindingSha256="sha256:b8e476f1713a623526c3e9560966761c873f7ac601c1753a4d49e6d5a91bcfdb"',
    'harnessInputBindingSha256=sha((evidence/"harness-input-binding.json").read_bytes())')
helpers = once(helpers, 'digest=output(phase+"-prepare")["preparation"]["digest"]',
    'digest=output("successor-prepare")["preparation"]["digest"]')
actions = actions.split('elif action=="fault":', 1)[0]
actions = once(actions,
    'phase=sys.argv[2]; result=output(phase+"-prepare"); proof=evidence/"proofs"/phase/"completion.json.prepared"',
    'phase="forward"; result=output("successor-prepare"); proof=evidence/"proofs"/phase/"completion.json.prepared"')
actions = once(actions, '    image_check(phase,True); source_check()\n', '''    binding=read(evidence/"harness-input-binding.json")
    assert selected["sourceGeneration"]==2 and selected["targetGeneration"]==3
    assert selected["initialProofPath"]==str(evidence/"proofs/forward/completion.json")
    assert selected["sourceCohort"]["cohortId"]==os.environ["FROM"]
    target=selected["targetCohort"]; expected=binding["target"]
    for key in ["cohortId","recordDigest","qualificationEventDigest","candidateDigest","workflow"]:
        assert target[key]==expected[key],key
    assert target["runtime"]["runtimeClosure"]["digest"]==expected["closure"]["digest"]
    assert target["packages"]=={key:{"version":value["version"],"integrity":value["integrity"]} for key,value in expected["packages"].items()}
    image_check(phase,True); source_check()
''')

export = '''elif action=="completed": completed("forward","successor-finalize","applied")
elif action=="export":
    completed("forward","successor-finalize","applied")
    checked=output("successor-check")
    assert checked["outcome"]=="current" and checked["issues"]==[]
    assert checked["plan"]["cohortId"]==os.environ["TO"]
    assert output("final-barrier")["state"]=="idle"
    assets=[]
    def describe(path,data,mode):
        return dict(path=path,bytes=len(data),sha256=sha(data),
            gitBlob=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\\0"+data).hexdigest(),mode=mode)
    for path in allowed:
        source=root/path; metadata=source.lstat(); data=source.read_bytes()
        assert stat.S_ISREG(metadata.st_mode) and metadata.st_nlink==1
        assert stat.S_IMODE(metadata.st_mode) in [0o644,0o755]
        dest=evidence/"managed-assets"/path; dest.parent.mkdir(parents=True,exist_ok=True)
        assert not dest.exists(); shutil.copy2(source,dest)
        assert dest.read_bytes()==data
        assets.append(describe(path,data,"100755" if stat.S_IMODE(metadata.st_mode)==0o755 else "100644"))
    write(evidence/"managed-assets-manifest.json",assets)
    paths=[]
    for label in ["successor-prepare","successor-finalize","successor-check"]:
        meta=read(evidence/"commands"/(label+".meta.json"))
        assert meta["label"]==label and meta["exitCode"]==0
        paths.extend("commands/"+label+"."+suffix for suffix in ["meta.json","stdout.json","stderr.log"])
    paths.extend("proofs/forward/completion.json"+suffix for suffix in ["",".prepared",".receipt"])
    files=[]
    for path in sorted(paths):
        p=evidence/path; metadata=p.lstat(); data=p.read_bytes()
        assert stat.S_ISREG(metadata.st_mode) and metadata.st_nlink==1
        mode=stat.S_IMODE(metadata.st_mode); assert mode in [0o600,0o644]
        files.append(describe(path,data,format(stat.S_IFREG|mode,"06o")))
    selected=prep("forward"); target=selected["targetCohort"]
    observation=dict(schemaVersion=1,scope="physical-managed-successor-forward",outcome="passed",
        qualificationAuthority=False,
        run=dict(repository=os.environ["GITHUB_REPOSITORY"],runId=os.environ["GITHUB_RUN_ID"],
                 runAttempt=os.environ["GITHUB_RUN_ATTEMPT"],headSha=os.environ["GITHUB_SHA"]),
        source=dict(revision=os.environ["SOURCE_REV"],tree=os.environ["SOURCE_TREE"],consumer=selected["consumer"]),
        authorityRevision=os.environ["AUTHORITY"],
        target={key:target[key] for key in ["cohortId","recordDigest","qualificationEventDigest"]},
        assets=assets,files=files)
    write(evidence/"forward-observation.json",observation)
    print("ORCHESTRATOR_FORWARD_RESULT "+json.dumps(dict(scope=observation["scope"],outcome="passed",
        qualificationAuthority=False,sourceRevision=os.environ["SOURCE_REV"],target=observation["target"],
        observationSha256=sha((evidence/"forward-observation.json").read_bytes()),fileCount=len(assets)),
        separators=(",",":")))
else: raise AssertionError(action)
'''
new_observer = helpers + "action=sys.argv[1]\n" + actions + export
compile(new_observer, "observe-forward.py", "exec")
footer = r'''observe() { python3 "$ROOT/observe.py" "$@"; }
barrier() {
  run "$1-barrier" success "$NODE24" --input-type=module --eval \
    'import {inspectKnownFileTransactionBarrier} from "@agent-teams/repository-mutation"; console.log(JSON.stringify(await inspectKnownFileTransactionBarrier({consumerRoot:process.argv[1]})));' "$CONSUMER"
  jq -e '.state=="idle"' "$EVID/commands/$1-barrier.stdout.json" > /dev/null
}
observe baseline
barrier initial
observe selected
quota successor-prepare 11
run successor-prepare success "$NODE24" "$CLI" upgrade --consumer "$CONSUMER" --to "$TO" \
  --source-generation 2 --target-generation 3 --prepare --restoration-proof "$FORWARD" \
  --target-lockfile "$SELECTED_LOCK" --target-lockfile-sha256 "$E2E_SELECTED_TARGET_LOCK_SHA256" --json
observe selected
observe prepare
DIGEST="$(jq -er '.preparation.digest' "$EVID/commands/successor-prepare.stdout.json")"
quota successor-finalize 8
run successor-finalize success "$NODE24" "$CLI" finalize --consumer "$CONSUMER" \
  --from "$FROM" --to "$TO" --source-generation 2 --target-generation 3 \
  --preparation "$FORWARD.prepared" --expect "$DIGEST" --proof "$FORWARD" --json
observe completed
run successor-check success "$NODE26" "$CLI" check --consumer "$CONSUMER" --json
barrier final
test "$(git -C "$CONSUMER" rev-parse HEAD)" = "$SOURCE_REV"
test "$(git -C "$CONSUMER" rev-parse 'HEAD^{tree}')" = "$SOURCE_TREE"
observe export
git -C "$CONSUMER" diff --binary "$SOURCE_REV" > "$EVID/target-successor.patch"
printf 'E2E_FORWARD_EVIDENCE=%s\nE2E_CONTROLLER=%s\nE2E_CONTROLLER_ROOT=%s\n' "$EVID" "$CLI" "$TOOLING" >> "$GITHUB_ENV"
printf 'AGENT_TEAMS_DOCS_UPGRADE_COREPACK_ENTRYPOINT=%s\nCOREPACK_HOME=%s\npnpm_config_store_dir=%s\nXDG_DATA_HOME=%s\nTMPDIR=%s\n' \
  "$COREPACK" "$COREPACK_HOME" "$pnpm_config_store_dir" "$XDG_DATA_HOME" "$TMPDIR" >> "$GITHUB_ENV"
'''
result = prefix + 'cat > "$ROOT/observe.py" <<\'PY\'\n' + new_observer + "\nPY\n" + footer
assert "physical-managed-lifecycle" not in result and "A-resume" not in result and "B-finalize" not in result
assert "f61e98c" not in result and "4451ea7" not in result and "997f243" not in result
assert result.count("successor-prepare success")==1 and result.count("successor-finalize success")==1
output = Path(__file__).with_name("orchestrator-managed-forward.sh")
output.write_text(result)
print(f"{output}: {len(result.encode())} bytes sha256:{hashlib.sha256(result.encode()).hexdigest()}")
