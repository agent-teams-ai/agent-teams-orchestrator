#!/usr/bin/env bash
set -euo pipefail

fixture_dir=$(mktemp -d)
trap 'rm -rf "$fixture_dir"' EXIT
mkdir -p "$fixture_dir/peer-probe" "$fixture_dir/target"

printf '%s\n' '{"name":"peer-probe","version":"1.0.0","peerDependencies":{"target":"^2.0.0"}}' > "$fixture_dir/peer-probe/package.json"
printf '%s\n' '{"name":"target","version":"1.0.0"}' > "$fixture_dir/target/package.json"
printf '%s\n' '{"name":"frozen-peer-enforcement","version":"1.0.0","private":true,"dependencies":{"peer-probe":"file:./peer-probe-1.0.0.tgz","target":"file:./target-1.0.0.tgz"}}' > "$fixture_dir/package.json"

(cd "$fixture_dir/peer-probe" && npm pack --silent --pack-destination "$fixture_dir" > /dev/null)
(cd "$fixture_dir/target" && npm pack --silent --pack-destination "$fixture_dir" > /dev/null)

# pnpm 11 can skip peer resolution on a frozen lockfile. Verify both the
# supported strict flag and the explicit check used by the compatibility lane.
if pnpm --dir "$fixture_dir" install --strict-peer-dependencies > "$fixture_dir/strict.log" 2>&1; then
  echo 'Expected strict peer resolution to reject the incompatible fixture' >&2
  exit 1
fi
if ! grep -q 'ERR_PNPM_PEER_DEP_ISSUES' "$fixture_dir/strict.log"; then
  cat "$fixture_dir/strict.log" >&2
  exit 1
fi

pnpm --dir "$fixture_dir" install --lockfile-only --strict-peer-dependencies=false > /dev/null
if (pnpm --dir "$fixture_dir" install --frozen-lockfile --config.engine-strict=true --strict-peer-dependencies && pnpm --dir "$fixture_dir" peers check) > "$fixture_dir/frozen.log" 2>&1; then
  echo 'Expected the frozen peer check to reject the incompatible fixture' >&2
  exit 1
fi
if ! grep -Eq 'unmet peer target|ERR_PNPM_PEER_DEP_ISSUES' "$fixture_dir/frozen.log"; then
  cat "$fixture_dir/frozen.log" >&2
  exit 1
fi
echo 'Frozen peer enforcement rejected the incompatible fixture'
