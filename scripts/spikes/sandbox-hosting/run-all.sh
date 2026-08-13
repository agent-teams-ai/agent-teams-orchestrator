#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/common.sh"

export EVIDENCE_DIR SPIKE_RUN_ID
export OPEN_SANDBOX_VOLUME_ROOT=${OPEN_SANDBOX_VOLUME_ROOT:?set OPEN_SANDBOX_VOLUME_ROOT}

cleanup_all() {
  cleanup_spike_resources
  uv run --with opensandbox "$SCRIPT_DIR/opensandbox-spike.py" cleanup >/dev/null 2>&1 || true
}

trap cleanup_all EXIT INT TERM
guard_host

for scenario in density recovery isolation; do
  "$SCRIPT_DIR/$scenario.sh"
done

for scenario in density recovery isolation; do
  guard_host
  uv run --with opensandbox "$SCRIPT_DIR/opensandbox-spike.py" "$scenario"
done

cleanup_all
trap - EXIT INT TERM
