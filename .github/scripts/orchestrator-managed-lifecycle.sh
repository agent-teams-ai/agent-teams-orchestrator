#!/usr/bin/env bash
# Disposable physical qualification. No owner receipt or authority is fabricated.
set -euo pipefail
umask 022
test "$GITHUB_ACTIONS" = true
test "$GITHUB_REPOSITORY" = agent-teams-ai/agent-teams-orchestrator
test "$GITHUB_REPOSITORY_ID" = 1310245598
test "$(id -u)" -ne 0
unset NODE_OPTIONS NODE_PATH
ORIGINAL_MAIN_REV=3dccf2c53bf11f3939a19734a58f5e64d96673d0
SOURCE_REV=ccc73331a2ca4f498a51fb6ee0f50b5d0cecff67
SOURCE_TREE=a24da96493edd1c6fe3bd5868d4cf636007bcf04
FROM=docs-2026-10-03-stable31
TO=docs-2026-11-27-orchestrator-v3
ROOT="$E2E_ROOT"
SELECTED_LOCK="$(realpath "$E2E_SELECTED_TARGET_LOCKFILE")"
test "$SELECTED_LOCK" = "$GITHUB_WORKSPACE/harness/.github/inputs/selected-target-lock.yaml"
test "$E2E_SELECTED_TARGET_LOCK_SHA256" = "sha256:a8080107bb13e2170fee5e3f25f30ff5df835cd5e540e66f177a0ef0e57c264b"
test "$(realpath "$E2E_HARNESS_INPUT_BINDING")" = "$GITHUB_WORKSPACE/harness/.github/inputs/harness-input-binding.json"
test "$(sha256sum "$E2E_HARNESS_INPUT_BINDING" | cut -d' ' -f1)" = "b8e476f1713a623526c3e9560966761c873f7ac601c1753a4d49e6d5a91bcfdb"
test "$(realpath "$E2E_TARGET_RUNTIME_CLOSURE")" = "$GITHUB_WORKSPACE/harness/.github/inputs/target-runtime-closure.json"
test "$(sha256sum "$E2E_TARGET_RUNTIME_CLOSURE" | cut -d' ' -f1)" = "7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475"
export SELECTED_LOCK ORIGINAL_MAIN_REV
CONSUMER="$(realpath "$E2E_CONSUMER")"
NODE24="$(realpath "$AGENT_TEAMS_DOCS_UPGRADE_NODE24_EXECUTABLE")"
NODE26="$(realpath "$AGENT_TEAMS_DOCS_UPGRADE_NODE26_EXECUTABLE")"
test "$CONSUMER" = "$E2E_CONSUMER"
test "$(git -C "$CONSUMER" rev-parse --show-toplevel)" = "$CONSUMER"
test "$(git -C "$CONSUMER" rev-parse HEAD)" = "$SOURCE_REV"
test "$(git -C "$CONSUMER" rev-parse 'HEAD^{tree}')" = "$SOURCE_TREE"
test -z "$(git -C "$CONSUMER" status --porcelain=v1 --untracked-files=all)"
test "$(sha256sum "$CONSUMER/pnpm-lock.yaml" | cut -d' ' -f1)" = "0ebee389b33d6ee41beb3f4a3dd28e20f956c177b17a2911d5a812160ea07044"
mkdir "$ROOT" # Exclusive allocation: never reuse another attempt or its live proofs.
EVID="$ROOT/evidence"
TOOLING="$ROOT/controller"
mkdir -p "$EVID/commands" "$EVID/authority" "$TOOLING" "$ROOT/cache" "$ROOT/tmp"
cp "$E2E_HARNESS_INPUT_BINDING" "$EVID/harness-input-binding.json"
cp "$E2E_TARGET_RUNTIME_CLOSURE" "$EVID/target-runtime-closure.json"
cp "$GITHUB_WORKSPACE/harness/.github/inputs/selected-target-lock-report.json" "$EVID/selected-target-lock-report.json"
test "$(sha256sum "$EVID/selected-target-lock-report.json" | cut -d' ' -f1)" = "4e04cf99c102c94f4289922a0bfb9a710ef6a7b6f578b126cbcaa3e26c716cdf"
mkdir -m 700 "$EVID/proofs" "$EVID/proofs/A" "$EVID/proofs/B" "$EVID/proofs/C"
A="$EVID/proofs/A/completion.json"
B="$EVID/proofs/B/completion.json"
C="$EVID/proofs/C/completion.json"
trap 'chmod 700 "$EVID/proofs/A" 2>/dev/null || true' EXIT
export ROOT EVID CONSUMER SOURCE_REV SOURCE_TREE FROM TO NODE24 NODE26
export COREPACK_HOME="$ROOT/cache/corepack" XDG_DATA_HOME="$ROOT/cache/xdg"
export pnpm_config_store_dir="$ROOT/cache/pnpm" TMPDIR="$ROOT/tmp"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 COREPACK_DEFAULT_TO_LATEST=0
export npm_config_audit=false npm_config_fund=false
export npm_config_userconfig="$ROOT/npmrc"
printf 'registry=https://registry.npmjs.org/\naudit=false\nfund=false\n' > "$ROOT/npmrc"

# Only this read-only preflight uses the job token. The unchanged CLI uses public fetch.
api() {
  local repository="${2:-agent-teams-ai/.github}"
  curl --fail --silent --show-error --max-time 60 \
    -H "Authorization: Bearer $CENTRAL_READ_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$repository/$1"
}
api branches/main agent-teams-ai/agent-teams-orchestrator > "$EVID/authority/consumer-main.json"
test "$(jq -er .commit.sha "$EVID/authority/consumer-main.json")" = "$ORIGINAL_MAIN_REV"
api commits/main > "$EVID/authority/main.json"
api branches/main > "$EVID/authority/branch.json"
AUTHORITY="$(jq -er .sha "$EVID/authority/main.json")"
test "$(jq -er .commit.sha "$EVID/authority/branch.json")" = "$AUTHORITY"
jq -e '.protected == true' "$EVID/authority/branch.json" > /dev/null
for item in docs-protocol-policy-v2 docs-qualified-cohorts; do
  curl --fail --silent --show-error --max-time 60 \
    "https://raw.githubusercontent.com/agent-teams-ai/.github/$AUTHORITY/governance/$item.json" \
    > "$EVID/authority/$item.json"
done
unset CENTRAL_READ_TOKEN
jq -e '
  [.repositories[] | select(.repository_id == 1310245598)] as $r |
  ($r|length)==1 and $r[0].cohort_binding_status=="rollout_pending" and
  $r[0].desired_cohort_id=="docs-2026-11-27-orchestrator-v3" and $r[0].desired_cohort_generation==3 and
  $r[0].observed_cohort_id=="docs-2026-10-03-stable31" and $r[0].observed_cohort_generation==2 and
  $r[0].v3_qualification_coordinates.profile_schema_version==4 and
  $r[0].v3_qualification_coordinates.cohort_schema_version==3 and
  $r[0].v3_qualification_coordinates.managed_state_schema_version==3 and
  $r[0].v3_qualification_coordinates.receipt_schema_version==1 and
  $r[0].v3_qualification_coordinates.execution_envelope_schema_version==1
' "$EVID/authority/docs-protocol-policy-v2.json" > /dev/null
jq -e '
  [.cohorts[] | select(.cohort_id=="docs-2026-11-27-orchestrator-v3")] as $r |
  ($r|length)==1 and $r[0].cohort_generation==3 and
  $r[0].record_digest=="sha256:f61e98c96fcc7beab30b6956312dead50a363c403fd67cdce4d0f18e8e69424c" and
  [$r[0].canary_repositories[].repository_id]==[1310245598] and
  $r[0].upgrade_from==["docs-2026-10-03-stable31"] and
  $r[0].rollback_to==["docs-2026-10-03-stable31"] and
  $r[0].reusable_workflow.revision=="997f24396598f93cf1b03bb26436a5ec7686ddef" and
  $r[0].reusable_workflow.blob_sha=="714af12998ef140dd55a2ec3057f67775586cfd7" and
  $r[0].policy_identity.version=="3.1.0" and $r[0].policy_identity.digest=="sha256:18db0135d1d6191ef78c1feb243f5dc672aaed9985f52be1a72af4fdd7e9bb4e" and
  ([.events[] | select(.cohort_id=="docs-2026-11-27-orchestrator-v3")] | last | .state=="QUALIFIED" and .event_digest=="sha256:4451ea715ef68048c01e182fe4755acc4639d7d2e106e536e2b240834e7084c0")
' "$EVID/authority/docs-qualified-cohorts.json" > /dev/null
export AUTHORITY

run() {
  local label="$1" expected="$2" started pid status
  shift 2
  started="$(date -u +%FT%TZ)"
  printf 'PHASE %s start %s\n' "$label" "$started"
  "$@" > "$EVID/commands/$label.stdout.json" 2> "$EVID/commands/$label.stderr.log" &
  pid=$!
  if wait "$pid"; then status=0; else status=$?; fi
  python3 - "$EVID/commands/$label.meta.json" "$label" "$PWD" "$pid" "$status" "$started" "$@" <<'PY'
import datetime,json,sys
out,label,cwd,pid,code,started,*argv=sys.argv[1:]
with open(out,"x") as f:
    json.dump(dict(label=label,argv=argv,cwd=cwd,pid=int(pid),exitCode=int(code),
                   startedAt=started,completedAt=datetime.datetime.now(datetime.timezone.utc).isoformat()),f)
    f.write("\n")
PY
  if { test "$expected" = success && test "$status" -ne 0; } ||
     { test "$expected" = failure && test "$status" -eq 0; }; then
    tail -c 8000 "$EVID/commands/$label.stderr.log"
    tail -c 8000 "$EVID/commands/$label.stdout.json"
    return 1
  fi
  printf 'PHASE %s exit %s\n' "$label" "$status"
}

# GET /rate_limit is read only and does not spend primary quota. No credentials or
# fetch interception are added to the production package. Wait only when the
# exact remaining phase budget does not fit, for at most one actual reset.
quota() {
  local label="$1" required="$2"
  "$NODE24" --input-type=module - "$label" "$required" "$EVID" <<'JS'
import {writeFile} from "node:fs/promises";
const [label,required,path]=process.argv.slice(2), deadline=Date.now()+3_660_000;
let attempt=0;
while (true) {
  const response=await fetch("https://api.github.com/rate_limit",{
    headers:{Accept:"application/vnd.github+json","User-Agent":"orchestrator-retained-lifecycle"},
    signal:AbortSignal.timeout(30_000),redirect:"error"});
  if(!response.ok) throw new Error("Anonymous quota observation failed: "+response.status);
  const value=await response.json(), core=value.resources.core;
  await writeFile(path+"/commands/"+label+".quota-"+attempt+++".json",
    JSON.stringify({observedAt:new Date().toISOString(),required:Number(required),core})+"\n",{flag:"wx"});
  console.log("QUOTA",label,JSON.stringify(core));
  if(core.remaining>=Number(required)) break;
  const wait=Math.max(1000,core.reset*1000-Date.now()+1000);
  if(Date.now()+wait>deadline) throw new Error("Anonymous quota reset exceeds bounded wait");
  for(let left=wait;left>0;left-=60_000) await new Promise(r=>setTimeout(r,Math.min(left,60_000)));
}
JS
}

printf '{"name":"orchestrator-retained-controller","private":true}\n' > "$TOOLING/package.json"
cd "$TOOLING"
run controller-install success npm install --ignore-scripts --no-audit --no-fund --save-exact \
  @agent-teams/docs-protocol-agent-teams@0.8.0 @agent-teams/repository-mutation@0.5.2 corepack@0.36.0
CONTROLLER="$(realpath "$TOOLING/node_modules/@agent-teams/docs-protocol-agent-teams")"
CLI="$CONTROLLER/dist/cli.js"
COREPACK="$(realpath "$TOOLING/node_modules/corepack/dist/corepack.js")"
export CONTROLLER CLI COREPACK AGENT_TEAMS_DOCS_UPGRADE_COREPACK_ENTRYPOINT="$COREPACK"
test "$("$NODE24" "$COREPACK" --version)" = 0.36.0
"$NODE24" --input-type=module > "$EVID/runtimes.json" <<'JS'
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile,realpath,lstat} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {computeInstalledArtifactBuildIdentity} from "@agent-teams/repository-mutation";
const sha=b=>"sha256:"+createHash("sha256").update(b).digest("hex"), env=process.env;
const lock=JSON.parse(await readFile("package-lock.json","utf8"));
for(const [name,version,integrity] of [
 ["docs-protocol-agent-teams","0.8.0","sha512-BixlYEalI0/j4auoSLBSBlKJGUXyZeuKS3WI+5nxdiAPg/yyAtKHjhmxuo059YZPn0+R931M0sdpNHRkpgDUDg=="],
 ["repository-mutation","0.5.2","sha512-eK/HsE/1qt+TXzrrbggXykZJXloFZfZD0ZlwdGbm2Jc9O6lAlhu7+w9BdSeryX/vCyMYWeRLv38S/7V717RPMg=="]]){
 const entry=lock.packages["node_modules/@agent-teams/"+name];
 assert.equal(entry.version,version);assert.equal(entry.integrity,integrity);
}
const observe=async(path,version)=>{
 assert.equal(await realpath(path),path);assert.ok((await lstat(path)).isFile());
 const actual=JSON.parse(execFileSync(path,["-p","JSON.stringify({node:process.versions.node,platform:process.platform,architecture:process.arch})"],{encoding:"utf8"}));
 assert.deepEqual(actual,{node:version,platform:"linux",architecture:"x64"});
 return {...actual,path,sha256:sha(await readFile(path))};
};
const physicalRoot=await lstat(env.CONSUMER,{bigint:true});
const consumerIdentity={root:env.CONSUMER,device:String(physicalRoot.dev),inode:String(physicalRoot.ino),birthtimeNs:String(physicalRoot.birthtimeNs)};
const controller=await computeInstalledArtifactBuildIdentity({packageRoot:env.CONTROLLER,roots:["dist","assets","schemas"]});
const kernelRoot=await realpath("node_modules/@agent-teams/repository-mutation");
const kernel=await computeInstalledArtifactBuildIdentity({packageRoot:kernelRoot,roots:["dist","schemas"]});
assert.equal(controller,"sha256:5d5563eb771de586b7d43e58aa68d1e62d92a58bff87a362ff5b8b7d582dac80");
assert.equal(kernel,"sha256:89c1df01b0fd3ea5d8db6adf51fa65a92f8509aaffde78217cb31a2c9084e8e1");
assert.equal(lock.packages["node_modules/corepack"].version,"0.36.0");
console.log(JSON.stringify({node24:await observe(env.NODE24,"24.22.3"),node26:await observe(env.NODE26,"26.12.1"),
 corepack:{version:"0.36.0",entrypoint:env.COREPACK,sha256:sha(await readFile(env.COREPACK)),integrity:lock.packages["node_modules/corepack"].integrity},
 controllerBuildIdentity:controller,kernelBuildIdentity:kernel,consumerIdentity}));
JS
cp "$TOOLING/package-lock.json" "$EVID/controller-package-lock.json"
run manager-source-cache success "$NODE24" "$COREPACK" prepare pnpm@11.18.0
run manager-target-cache success "$NODE24" "$COREPACK" prepare pnpm@11.20.0
for tuple in source:11.18.0 target:11.20.0; do
  kind="$(printf %s "$tuple" | cut -d: -f1)"
  version="$(printf %s "$tuple" | cut -d: -f2)"
  mkdir "$ROOT/manager-$kind"
  printf '{"private":true,"packageManager":"pnpm@%s"}\n' "$version" > "$ROOT/manager-$kind/package.json"
  cd "$ROOT/manager-$kind"
  if test "$kind" = source; then runtime="$NODE24"; else runtime="$NODE26"; fi
  test "$(COREPACK_ENABLE_NETWORK=0 "$runtime" "$COREPACK" pnpm --version)" = "$version"
  COREPACK_ENABLE_NETWORK=0 "$runtime" "$COREPACK" pnpm store path > "$EVID/manager-$kind-store.txt"
  case "$(cat "$EVID/manager-$kind-store.txt")" in "$ROOT/cache/pnpm/"*) ;; *) exit 1 ;; esac
done

# Warm the authentic source's offline rollback cache without executing its old
# Foundation/compiler or mutating any source file. Only package extraction runs.
mkdir "$ROOT/source-cache"
git -C "$CONSUMER" archive "$SOURCE_REV" | tar -x -C "$ROOT/source-cache"
cd "$ROOT/source-cache"
run source-cache-install success "$NODE24" "$COREPACK" pnpm install --frozen-lockfile \
  --package-import-method=copy --ignore-scripts --ignore-pnpmfile --verify-store-integrity
rm -rf "$ROOT/source-cache"
cd "$TOOLING"

cat > "$ROOT/observe.py" <<'PY'
import base64,hashlib,json,os,pathlib,shutil,stat,subprocess,sys
root=pathlib.Path(os.environ["CONSUMER"]); evidence=pathlib.Path(os.environ["EVID"])
allowed=sorted(["architecture/foundation/docs-consumer-integration.json",
 "architecture/foundation/docs-protocol-managed-state.json",".github/workflows/docs-protocol.yml",
 "package.json","pnpm-workspace.yaml","pnpm-lock.yaml",".node-version"])
sha=lambda b:"sha256:"+hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(pathlib.Path(p).read_bytes())
write=lambda p,v:pathlib.Path(p).write_text(json.dumps(v,sort_keys=True,separators=(",",":"))+"\n")
def snapshot():
    result=[]
    for parent,dirs,files in os.walk(root,followlinks=False):
        prefix=pathlib.Path(parent).relative_to(root)
        dirs[:]=sorted(d for d in dirs if d!="node_modules" and not(prefix==pathlib.Path(".") and d in [".git",".agent-teams-local"]))
        for d in dirs: assert not (pathlib.Path(parent)/d).is_symlink()
        for name in sorted(files):
            path=pathlib.Path(parent)/name; metadata=path.lstat()
            assert stat.S_ISREG(metadata.st_mode) and metadata.st_nlink==1,str(path)
            result.append(dict(path=path.relative_to(root).as_posix(),digest=sha(path.read_bytes()),mode=stat.S_IMODE(metadata.st_mode)))
    return sorted(result,key=lambda x:x["path"])
def output(label): return read(evidence/"commands"/(label+".stdout.json"))
def prep(phase): return read(evidence/"proofs"/phase/"completion.json.prepared")
def selected_lock_check(initial=False):
    path=pathlib.Path(os.environ["SELECTED_LOCK"])
    assert path.resolve()==path and path.is_absolute()
    for other in [root,pathlib.Path(os.environ["ROOT"])]:
        assert path!=other and other not in path.parents and path not in other.parents
    before=path.lstat(); data=path.read_bytes(); after=path.lstat()
    assert stat.S_ISREG(before.st_mode) and before.st_nlink==1 and 0<len(data)<=32*1024*1024
    assert (before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns,before.st_ctime_ns)==(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns)
    assert sha(data)==os.environ["E2E_SELECTED_TARGET_LOCK_SHA256"]=="sha256:a8080107bb13e2170fee5e3f25f30ff5df835cd5e540e66f177a0ef0e57c264b"
    assert len(data)==320228
    observed=dict(schemaVersion=1,scope="selected-lock-input",qualificationAuthority=False,
        path=str(path),bytes=len(data),sha256=sha(data),gitBlob=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest(),
        device=str(before.st_dev),inode=str(before.st_ino),mode=format(stat.S_IMODE(before.st_mode),"04o"),
        sourceRevision=os.environ["SOURCE_REV"],sourceTree=os.environ["SOURCE_TREE"],
        sourceLockSha256="sha256:0ebee389b33d6ee41beb3f4a3dd28e20f956c177b17a2911d5a812160ea07044",closureDigest="sha256:7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475",
        constructionReportSha256="sha256:4e04cf99c102c94f4289922a0bfb9a710ef6a7b6f578b126cbcaa3e26c716cdf",harnessInputBindingSha256="sha256:b8e476f1713a623526c3e9560966761c873f7ac601c1753a4d49e6d5a91bcfdb")
    assert observed["gitBlob"]=="5b452244b3d74dd49432e659abd575efca49c4c2"
    if initial:
        assert not (evidence/"selected-lock-observation.json").exists()
        write(evidence/"selected-lock-observation.json",observed)
        (evidence/"selected-target-lock.yaml").write_bytes(data)
    else:
        assert observed==read(evidence/"selected-lock-observation.json")
        assert (evidence/"selected-target-lock.yaml").read_bytes()==data
    return data
def image_check(phase,source):
    selected=prep(phase)
    assert sorted(x["path"] for x in selected["plan"]["operations"])==allowed
    selected_bytes=selected_lock_check()
    lock_op=next(x for x in selected["plan"]["operations"] if x["path"]=="pnpm-lock.yaml")
    assert lock_op["postimage"]["digest"]==sha(selected_bytes)
    assert base64.b64decode(lock_op["postimage"]["contentBase64"],validate=True)==selected_bytes
    pin_op=next(x for x in selected["plan"]["operations"] if x["path"]==".node-version")
    assert len(pin_op["precondition"]["acceptedPreimages"])==1
    pin_before=pin_op["precondition"]["acceptedPreimages"][0]
    assert base64.b64decode(pin_before["contentBase64"],validate=True)==b"26.11.1\n"
    assert base64.b64decode(pin_op["postimage"]["contentBase64"],validate=True)==b"26.12.1\n"
    assert pin_op["postimage"]["mode"]==pin_before["mode"]
    expected={x["path"]:x for x in read(evidence/"source-inventory.json")}
    for op in selected["plan"]["operations"]:
        assert op["precondition"]["state"]=="known-file" and len(op["precondition"]["acceptedPreimages"])==1
        original=op["precondition"]["acceptedPreimages"][0]
        assert expected[op["path"]]==dict(path=op["path"],digest=original["digest"],mode=original["mode"])
        image=original if source else op["postimage"]
        path=root/op["path"]; data=path.read_bytes()
        assert data==base64.b64decode(image["contentBase64"],validate=True),str(path)
        assert sha(data)==image["digest"] and stat.S_IMODE(path.stat().st_mode)==image["mode"],str(path)
        expected[op["path"]]=dict(path=op["path"],digest=image["digest"],mode=image["mode"])
    assert snapshot()==sorted(expected.values(),key=lambda x:x["path"]),"Unrelated repository content or mode changed"
def source_check():
    assert snapshot()==read(evidence/"source-inventory.json"),"Whole source bytes/modes differ"
    assert (root/".node-version").read_bytes()==b"26.11.1\n"
def completed(phase,label,expected):
    image_check(phase,False)
    selected=prep(phase); result=output(label); receipt=result["receipt"]
    assert result["outcome"]=="upgraded" and result["issues"]==[]
    assert receipt["planDigest"]==selected["plan"]["planDigest"] and receipt["outcome"]==expected
    op_outcome="already-satisfied" if expected=="already-satisfied" else "replaced"
    assert sorted(x["path"] for x in receipt["operations"])==allowed
    assert all(x["outcome"]==op_outcome for x in receipt["operations"])
    proof=evidence/"proofs"/phase/"completion.json"
    digest=output(phase+"-prepare")["preparation"]["digest"]
    assert sha(proof.read_bytes())==result["restoration"]["digest"]
    completion=read(proof); companion=read(str(proof)+".receipt")
    assert completion["protocol"]=="agent-teams.managed-generation3-completion/v1"
    assert completion["preparationDigest"]==digest and completion["activation"]=="verified-current-v3"
    assert completion["receipt"]==receipt and companion==dict(preparationDigest=digest,receipt=receipt)
action=sys.argv[1]
if action=="baseline":
    selected_lock_check(initial=True)
    write(evidence/"source-inventory.json",snapshot()); source_check()
elif action=="selected": selected_lock_check()
elif action=="source": source_check()
elif action=="prepare":
    phase=sys.argv[2]; result=output(phase+"-prepare"); proof=evidence/"proofs"/phase/"completion.json.prepared"
    selected=prep(phase)
    assert result["outcome"]=="prepared" and result["issues"]==[]
    assert result["preparation"]["path"]==str(proof) and sha(proof.read_bytes())==result["preparation"]["digest"]
    assert selected["sourceRevision"]==os.environ["SOURCE_REV"] and selected["sourceTree"]==os.environ["SOURCE_TREE"]
    for key,value in read(evidence/"runtimes.json")["consumerIdentity"].items():
        assert selected["consumer"][key]==value,(key,selected["consumer"][key],value)
    assert selected["controller"]["buildIdentity"]==read(evidence/"runtimes.json")["controllerBuildIdentity"]
    assert selected["kernel"]["buildIdentity"]==read(evidence/"runtimes.json")["kernelBuildIdentity"]
    image_check(phase,True); source_check()
elif action=="fault":
    image_check("A",False)
    proof=evidence/"proofs/A/completion.json"
    assert not proof.exists() and not pathlib.Path(str(proof)+".receipt").exists()
    assert sha(pathlib.Path(str(proof)+".prepared").read_bytes())==output("A-prepare")["preparation"]["digest"]
    assert read(evidence/"commands/A-fault.meta.json")["exitCode"]!=0
    text=(evidence/"commands/A-fault.stdout.json").read_text()+(evidence/"commands/A-fault.stderr.log").read_text()
    result=output("A-fault")
    assert result["outcome"]=="blocked" and result["command"]=="consumer.finalize"
    assert "EACCES" in text and "permission denied" in text and "open" in text,text
elif action=="completed": completed(*sys.argv[2:])
elif action=="restored":
    phase,label=sys.argv[2:]; source_check(); image_check(phase,True)
    result=output(label)
    assert result["outcome"]=="restored" and result["issues"]==[]
    assert result["receipt"]["outcome"]=="applied"
    assert all(x["outcome"]=="replaced" for x in result["receipt"]["operations"])
    if phase=="A": assert result["proofDigest"]==output("A-prepare")["preparation"]["digest"]
    else: assert result["proofDigest"]==sha((evidence/"proofs/B/current-selection.json").read_bytes())
elif action=="export":
    completed("C","C-finalize","applied")
    assets=[]
    for path in allowed:
        source=root/path; data=source.read_bytes(); dest=evidence/"managed-assets"/path
        dest.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(source,dest)
        assert dest.read_bytes()==data
        assert stat.S_IMODE(source.stat().st_mode) in [0o644,0o755]
        mode="100755" if stat.S_IMODE(source.stat().st_mode)==0o755 else "100644"
        item=dict(path=path,bytes=len(data),sha256=sha(data),gitBlob=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest(),mode=mode)
        assets.append(item)
    write(evidence/"managed-assets-manifest.json",assets)
    phases={}
    for phase,label in [("A","A-resume"),("B","B-finalize"),("C","C-finalize")]:
        phases[phase]=dict(preparationDigest=output(phase+"-prepare")["preparation"]["digest"],
                          planDigest=prep(phase)["plan"]["planDigest"],**{("resume" if phase=="A" else "finalize"):output(label)})
    phases["A"].update(faultExitCode=read(evidence/"commands/A-fault.meta.json")["exitCode"],restore=output("A-restore"),inventoryRestored=True)
    phases["B"].update(finalize=output("B-finalize"),targetCommit=(evidence/"target-B-commit.txt").read_text().strip(),
        targetTree=(evidence/"target-B-tree.txt").read_text().strip(),committedRestore=output("B-committed-restore"),
        selectionDigest=sha((evidence/"proofs/B/current-selection.json").read_bytes()),inventoryRestored=True)
    summary=dict(schemaVersion=1,scope="physical-managed-lifecycle",outcome="passed",
        run=dict(repository=os.environ["GITHUB_REPOSITORY"],runId=os.environ["GITHUB_RUN_ID"],runAttempt=os.environ["GITHUB_RUN_ATTEMPT"]),
        source=dict(revision=os.environ["SOURCE_REV"],tree=os.environ["SOURCE_TREE"],consumer=prep("C")["consumer"]),
        authorityRevision=os.environ["AUTHORITY"],controller=prep("C")["controller"],kernel=prep("C")["kernel"],
        runtimes=read(evidence/"runtimes.json"),phases=phases,assets=assets,
        originalMainRevision=os.environ["ORIGINAL_MAIN_REV"],selectedTargetLock=read(evidence/"selected-lock-observation.json"),
        harnessInputBindingSha256=sha((evidence/"harness-input-binding.json").read_bytes()))
    write(evidence/"summary.json",summary)
    proof_records=[]
    proof_paths=[p for p in (evidence/"proofs").rglob("*") if p.is_file()]+[evidence/"source-inventory.json"]
    for p in sorted(proof_paths):
        b=p.read_bytes()
        proof_records.append(dict(path=p.relative_to(evidence).as_posix(),bytes=len(b),sha256=sha(b),mode=format(stat.S_IMODE(p.stat().st_mode),"04o")))
    write(evidence/"proofs-manifest.json",proof_records)
    def emit(item,data,kind):
        encoded=base64.b64encode(data).decode()
        pieces=[encoded[i:i+12000] for i in range(0,len(encoded),12000)]
        print("ORCHESTRATOR_E2E_FILE "+json.dumps(dict(**item,kind=kind,chunks=len(pieces)),separators=(",",":")))
        for i,piece in enumerate(pieces):
            print("ORCHESTRATOR_E2E_CHUNK "+json.dumps(dict(path=item["path"],kind=kind,index=i,total=len(pieces),base64=piece),separators=(",",":")))
        print("ORCHESTRATOR_E2E_END "+json.dumps(dict(path=item["path"],kind=kind,sha256=item["sha256"]),separators=(",",":")))
    for item in assets: emit(item,(root/item["path"]).read_bytes(),"managed-asset")
    compact=["summary.json","managed-assets-manifest.json","runtimes.json","controller-package-lock.json",
        "target-B-commit.txt","target-B-tree.txt","target-B-commit.raw","proofs-manifest.json","authority/consumer-main.json",
        "selected-target-lock.yaml","selected-lock-observation.json","selected-target-lock-report.json","harness-input-binding.json","target-runtime-closure.json"]
    for label in ["A-prepare","A-fault","A-resume","A-restore","B-prepare","B-finalize","B-committed-restore","C-prepare","C-finalize"]:
        compact.extend(["commands/"+label+".stdout.json","commands/"+label+".meta.json"])
    compact.append("commands/A-fault.stderr.log")
    for label in ["initial","after-fault","after-original-restore","after-committed-restore","final"]:
        compact.append("commands/"+label+"-barrier.stdout.json")
    for path in compact:
        data=(evidence/path).read_bytes()
        item=dict(path=path,bytes=len(data),sha256=sha(data),gitBlob=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest(),mode="100644")
        emit(item,data,"evidence")
else: raise AssertionError(action)
PY
observe() { python3 "$ROOT/observe.py" "$@"; }
barrier() {
  run "$1-barrier" success "$NODE24" --input-type=module --eval \
    'import {inspectKnownFileTransactionBarrier} from "@agent-teams/repository-mutation"; console.log(JSON.stringify(await inspectKnownFileTransactionBarrier({consumerRoot:process.argv[1]})));' "$CONSUMER"
  jq -e '.state=="idle"' "$EVID/commands/$1-barrier.stdout.json" > /dev/null
}
prepare() {
  observe selected
  quota "$1-prepare" 6
  run "$1-prepare" success "$NODE24" "$CLI" upgrade --consumer "$CONSUMER" --to "$TO" \
    --source-generation 2 --target-generation 3 --prepare --restoration-proof "$2" \
    --target-lockfile "$SELECTED_LOCK" --target-lockfile-sha256 "$E2E_SELECTED_TARGET_LOCK_SHA256" --json
  observe selected
  observe prepare "$1"
}
finalize() {
  local label="$1" expected="$2" proof="$3" digest="$4" budget="$5"
  quota "$label" "$budget"
  run "$label" "$expected" "$NODE24" "$CLI" finalize --consumer "$CONSUMER" \
    --from "$FROM" --to "$TO" --source-generation 2 --target-generation 3 \
    --preparation "$proof.prepared" --expect "$digest" --proof "$proof" --json
}
observe baseline
barrier initial
prepare A "$A"
DA="$(jq -er '.preparation.digest' "$EVID/commands/A-prepare.stdout.json")"
chmod 500 "$EVID/proofs/A"
finalize A-fault failure "$A" "$DA" 4
chmod 700 "$EVID/proofs/A"
observe fault
test "$(git -C "$CONSUMER" rev-parse HEAD)" = "$SOURCE_REV"
test "$(git -C "$CONSUMER" rev-parse 'HEAD^{tree}')" = "$SOURCE_TREE"
barrier after-fault
# New node process; the published controller re-observes honest already-satisfied.
finalize A-resume success "$A" "$DA" 8
observe completed A A-resume already-satisfied
quota A-restore 4
run A-restore success "$NODE24" "$CLI" restore --consumer "$CONSUMER" --from "$TO" --to "$FROM" \
  --source-generation 3 --target-generation 2 --preparation "$A.prepared" --expect "$DA" --json
observe restored A A-restore
barrier after-original-restore
prepare B "$B"
DB="$(jq -er '.preparation.digest' "$EVID/commands/B-prepare.stdout.json")"
finalize B-finalize success "$B" "$DB" 8
observe completed B B-finalize applied
git -C "$CONSUMER" switch -c qualification/managed-target-B
git -C "$CONSUMER" add -- architecture/foundation/docs-consumer-integration.json \
  architecture/foundation/docs-protocol-managed-state.json .github/workflows/docs-protocol.yml \
  package.json pnpm-workspace.yaml pnpm-lock.yaml .node-version
GIT_AUTHOR_NAME=Илия GIT_AUTHOR_EMAIL=iliyazelenkog@gmail.com \
  GIT_COMMITTER_NAME=Илия GIT_COMMITTER_EMAIL=iliyazelenkog@gmail.com \
  git -C "$CONSUMER" -c user.name=Илия -c user.email=iliyazelenkog@gmail.com \
  -c core.hooksPath=/dev/null -c commit.gpgsign=false commit -m "Qualify actual managed generation 3 target"
test -z "$(git -C "$CONSUMER" status --porcelain=v1 --untracked-files=all)"
git -C "$CONSUMER" cat-file commit HEAD > "$EVID/target-B-commit.raw"
python3 - "$CONSUMER" <<'PY'
import subprocess,sys
observed=subprocess.check_output(["git","-C",sys.argv[1],"show","-s","--format=%an%n%ae%n%cn%n%ce","HEAD"],text=True).splitlines()
assert observed==["Илия","iliyazelenkog@gmail.com","Илия","iliyazelenkog@gmail.com"],observed
PY
git -C "$CONSUMER" rev-parse HEAD > "$EVID/target-B-commit.txt"
git -C "$CONSUMER" rev-parse 'HEAD^{tree}' > "$EVID/target-B-tree.txt"
git -C "$CONSUMER" diff --binary "$SOURCE_REV" HEAD > "$EVID/target-B.patch"
quota B-committed-restore 6
run B-committed-restore success "$NODE24" "$CLI" restore --consumer "$CONSUMER" --from "$TO" --to "$FROM" \
  --source-generation 3 --target-generation 2 --preparation "$B.prepared" --expect "$DB" \
  --current-revision "$(cat "$EVID/target-B-commit.txt")" --current-tree "$(cat "$EVID/target-B-tree.txt")" \
  --selection "$EVID/proofs/B/current-selection.json" --json
observe restored B B-committed-restore
barrier after-committed-restore
# Public restore has already proved exact source bytes/modes. Preserve B's commit,
# then reselect the authentic source in this exclusively owned disposable root.
git -C "$CONSUMER" update-ref refs/qualification/managed-target-B "$(cat "$EVID/target-B-commit.txt")"
git -C "$CONSUMER" reset --hard "$SOURCE_REV"
observe source
test "$(git -C "$CONSUMER" rev-parse 'HEAD^{tree}')" = "$SOURCE_TREE"
prepare C "$C"
DC="$(jq -er '.preparation.digest' "$EVID/commands/C-prepare.stdout.json")"
finalize C-finalize success "$C" "$DC" 8
observe completed C C-finalize applied
barrier final
git -C "$CONSUMER" diff --binary "$SOURCE_REV" > "$EVID/target-C.patch"
observe export
printf 'E2E_EVIDENCE=%s\nE2E_CONTROLLER=%s\n' "$EVID" "$CLI" >> "$GITHUB_ENV"
printf 'AGENT_TEAMS_DOCS_UPGRADE_COREPACK_ENTRYPOINT=%s\nCOREPACK_HOME=%s\npnpm_config_store_dir=%s\nXDG_DATA_HOME=%s\nTMPDIR=%s\n' \
  "$COREPACK" "$COREPACK_HOME" "$pnpm_config_store_dir" "$XDG_DATA_HOME" "$TMPDIR" >> "$GITHUB_ENV"
