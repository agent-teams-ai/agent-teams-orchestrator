/** Proposed semantic conformance model. No production adapter or provider IO. */
import assert from "node:assert/strict";
import test from "node:test";
import { assert as checkProperty, property, array, boolean } from "fast-check";

type Descriptor =
  | "CreateTeam"
  | "CreateRun"
  | "CreateTask"
  | "UpdateTask"
  | "SendMessage"
  | "EnsureDirectConversation";
type Command = Readonly<{
  descriptor: Descriptor;
  requestId: string;
  scope: string;
  subject: string;
  payload: Readonly<Record<string, string>>;
  etag?: string;
}>;
type Authority = Readonly<{ scope: string; subject: string; writable: boolean }>;
type Receipt = Readonly<{ operation: string; resource: string; result: "committed" }>;
type Failure = "FORBIDDEN" | "REQUEST_CONFLICT" | "STALE_ETAG" | "NOT_FOUND";
type Result = Receipt | Failure;
type LedgerEntry = Readonly<{ fingerprint: string; receipt: Receipt }>;
type Model = {
  ledger: Map<string, LedgerEntry>;
  resources: Map<string, { payload: Readonly<Record<string, string>>; etag: string }>;
  commits: bigint;
};

const fixtureVersion = "desktop-first-slice/v1";
const scope = "tenants/test/projects/sandbox";
const authority: Authority = { scope, subject: "test-member", writable: true };
const create = (requestId = "request-a"): Command => ({
  descriptor: "CreateTask",
  requestId,
  scope,
  subject: authority.subject,
  payload: { subject: "Sandbox task", description: "Fixture only" },
});
const model = (): Model => ({ ledger: new Map(), resources: new Map(), commits: 0n });
const fingerprint = (command: Command): string =>
  JSON.stringify({
    payload: Object.entries(command.payload).toSorted(([left], [right]) =>
      left.localeCompare(right),
    ),
    etag: command.etag ?? null,
  });
const key = (command: Command): string =>
  JSON.stringify([command.scope, command.descriptor, command.requestId]);

// Reference owner transaction: authority -> receipt conflict -> CAS -> effect + receipt.
// Host/provider/runtime implementations must later satisfy the independent scenarios below.
function accept(state: Model, command: Command, trusted: Authority): Result {
  if (!trusted.writable || command.scope !== trusted.scope || command.subject !== trusted.subject) {
    return "FORBIDDEN";
  }
  const prior = state.ledger.get(key(command));
  if (prior) {
    return prior.fingerprint === fingerprint(command) ? prior.receipt : "REQUEST_CONFLICT";
  }
  const resource = command.payload["resource"];
  if (command.descriptor === "UpdateTask") {
    const current = resource === undefined ? undefined : state.resources.get(resource);
    if (!current) {
      return "NOT_FOUND";
    }
    if (current.etag !== command.etag) {
      return "STALE_ETAG";
    }
  }
  state.commits += 1n;
  const opaqueId = state.commits.toString();
  const resourceName = resource ?? `${command.scope}/fixture-resources/${opaqueId}`;
  const receipt: Receipt = {
    operation: `${command.scope}/operations/change-fixture-${opaqueId}`,
    resource: resourceName,
    result: "committed",
  };
  state.resources.set(resourceName, { payload: command.payload, etag: `opaque-${opaqueId}` });
  state.ledger.set(key(command), { fingerprint: fingerprint(command), receipt });
  return receipt;
}
function committed(result: Result): Receipt {
  assert.equal(typeof result, "object");
  if (typeof result === "string") {
    throw new Error(result);
  }
  return result;
}

type Dispatch = {
  intent: string;
  runtimeOperation: string | null;
  outcome: "pending" | "unknown" | "runtime-accepted" | "terminal";
  providerHandoffs: bigint;
};
function dispatch(state: Dispatch, observed: "response-lost" | "accepted"): void {
  if (state.outcome !== "pending") {
    return;
  }
  state.providerHandoffs += 1n;
  state.outcome = observed === "response-lost" ? "unknown" : "runtime-accepted";
}
function reconcile(state: Dispatch, operation: string | null): void {
  if (operation !== null) {
    state.runtimeOperation = operation;
    state.outcome = "runtime-accepted";
  }
}

test(`${fixtureVersion}: commit followed by lost response resolves original receipt`, () => {
  const state = model();
  const original = committed(accept(state, create(), authority));
  const restartedFacade = { command: create(), owner: "new", operation: null };
  assert.deepEqual(accept(state, restartedFacade.command, authority), original);
  assert.equal(state.commits, 1n);
  assert.notEqual(original.operation, original.resource);
  assert.equal(
    accept(state, { ...create(), payload: { subject: "Different" } }, authority),
    "REQUEST_CONFLICT",
  );
  assert.equal(state.commits, 1n);
});

test(`${fixtureVersion}: semantic field order and command descriptor define replay`, () => {
  const state = model();
  const first = committed(accept(state, create(), authority));
  assert.deepEqual(
    accept(
      state,
      { ...create(), payload: { description: "Fixture only", subject: "Sandbox task" } },
      authority,
    ),
    first,
  );
  committed(accept(state, { ...create(), descriptor: "SendMessage" }, authority));
  assert.equal(state.commits, 2n);
});

test(`${fixtureVersion}: authentication is current even when receipt already exists`, () => {
  const state = model();
  committed(accept(state, create(), authority));
  for (const trusted of [
    { ...authority, writable: false },
    { ...authority, scope: "target-a/tenants/other/projects/sandbox" },
    { ...authority, subject: "forged-member" },
  ]) {
    assert.equal(accept(state, create(), trusted), "FORBIDDEN");
  }
  assert.equal(state.commits, 1n);
});

test(`${fixtureVersion}: stale task edits never overwrite concurrent commits`, () => {
  const state = model();
  const task = committed(accept(state, create(), authority));
  const edit: Command = {
    ...create("edit-a"),
    descriptor: "UpdateTask",
    etag: "opaque-1",
    payload: { resource: task.resource, subject: "Edited", description: "Fixture only" },
  };
  const updated = committed(accept(state, edit, authority));
  assert.deepEqual(accept(state, edit, authority), updated);
  assert.equal(accept(state, { ...edit, requestId: "edit-b" }, authority), "STALE_ETAG");
  assert.equal(state.resources.get(task.resource)?.payload["subject"], "Edited");
  assert.equal(state.commits, 2n);
});

test(`${fixtureVersion}: arbitrary duplicate/restart order has one committed effect`, () => {
  checkProperty(
    property(array(boolean(), { minLength: 1, maxLength: 64 }), (losses) => {
      const state = model();
      let retained: Receipt | undefined;
      for (const lost of losses) {
        const receipt = committed(accept(state, create(), authority));
        if (!lost) {
          retained ??= receipt;
        }
        if (retained) {
          assert.deepEqual(receipt, retained);
        }
      }
      assert.equal(state.commits, 1n);
    }),
    { seed: 20261021, numRuns: 100 },
  );
});

test(`${fixtureVersion}: runtime unknown is reconciled without replay or synthetic operation`, () => {
  const state: Dispatch = {
    intent: "stable-runtime-command",
    runtimeOperation: null,
    outcome: "pending",
    providerHandoffs: 0n,
  };
  dispatch(state, "response-lost");
  dispatch(state, "accepted");
  reconcile(state, null);
  assert.equal(state.outcome, "unknown");
  assert.equal(state.providerHandoffs, 1n);
  assert.equal(state.runtimeOperation, null);
  reconcile(state, "runtime-opaque-operation");
  assert.equal(state.outcome, "runtime-accepted");
  assert.equal(state.runtimeOperation, "runtime-opaque-operation");
  assert.equal(state.providerHandoffs, 1n);
});

function mayRollback(outcome: "not-seen" | "accepted" | "unknown"): boolean {
  return outcome === "not-seen";
}
test(`${fixtureVersion}: no legacy fallback once accepted or unknown`, () => {
  assert.equal(mayRollback("not-seen"), true);
  assert.equal(mayRollback("accepted"), false);
  assert.equal(mayRollback("unknown"), false);
});

type FeedEvent = Readonly<{ target: string; generation: string; feed: string; eventId: string }>;
function applyFeed(
  events: readonly FeedEvent[],
  active: { target: string; generation: string },
): string[] {
  const seen = new Set<string>();
  const accepted: string[] = [];
  for (const event of events) {
    if (event.target !== active.target || event.generation !== active.generation) {
      continue;
    }
    const identity = JSON.stringify([event.target, event.generation, event.feed, event.eventId]);
    if (!seen.has(identity)) {
      accepted.push(`${event.feed}:${event.eventId}`);
    }
    seen.add(identity);
  }
  return accepted;
}

test(`${fixtureVersion}: independent feed cursors, duplicates, and late target results`, () => {
  const current = { target: "server-a", generation: "client-2" };
  const event = { ...current, feed: "work", eventId: "event-a" };
  assert.deepEqual(
    applyFeed(
      [
        event,
        event,
        { ...event, feed: "conversation" },
        { ...event, target: "server-b" },
        { ...event, generation: "client-1" },
      ],
      current,
    ),
    ["work:event-a", "conversation:event-a"],
  );
});

type DeliveryEvidence = { committed?: true; runtimeAccepted?: true; read?: true; replied?: true };
function observeDelivery(
  state: DeliveryEvidence,
  event: "commit" | "runtime-accepted" | "read" | "reply",
): DeliveryEvidence {
  switch (event) {
    case "commit":
      return { ...state, committed: true };
    case "runtime-accepted":
      return { ...state, runtimeAccepted: true };
    case "read":
      return { ...state, read: true };
    case "reply":
      return { ...state, replied: true };
  }
}
test(`${fixtureVersion}: runtime acceptance cannot invent read or reply evidence`, () => {
  const initial: DeliveryEvidence = {};
  const state = observeDelivery(observeDelivery(initial, "commit"), "runtime-accepted");
  assert.deepEqual(state, { committed: true, runtimeAccepted: true });
  assert.equal(observeDelivery(state, "read").replied, undefined);
});

type RetentionPolicy = {
  validityEnds: bigint;
  skew: bigint;
  recoveryGrace: bigint;
  resultEnds: bigint;
  reuseEnds: bigint;
};
function retentionValid(value: RetentionPolicy): boolean {
  return (
    value.skew >= 0n &&
    value.recoveryGrace >= 0n &&
    value.resultEnds >= value.validityEnds &&
    value.reuseEnds >= value.validityEnds + value.skew + value.recoveryGrace &&
    value.reuseEnds >= value.resultEnds
  );
}
function resolveAt(time: bigint, value: RetentionPolicy): "accepted" | "expired" | "invalid-key" {
  if (time <= value.resultEnds) {
    return "accepted";
  }
  if (time <= value.reuseEnds) {
    return "expired";
  }
  return "invalid-key";
}
test(`${fixtureVersion}: finite result expiry never reopens an expired request`, () => {
  const policy = {
    validityEnds: 100n,
    skew: 2n,
    recoveryGrace: 10n,
    resultEnds: 110n,
    reuseEnds: 112n,
  };
  assert.equal(retentionValid(policy), true);
  assert.equal(retentionValid({ ...policy, reuseEnds: 111n }), false);
  assert.equal(resolveAt(110n, policy), "accepted");
  assert.equal(resolveAt(111n, policy), "expired");
  assert.equal(resolveAt(113n, policy), "invalid-key");
});

type RunState =
  | "admitted"
  | "activating"
  | "active"
  | "cancelling"
  | "cancelled"
  | "failed-unknown";
type RunSignal = "activate" | "ready" | "cancel" | "stop-confirmed" | "stop-unknown" | "late-ready";
function advanceRun(state: RunState, signal: RunSignal): RunState {
  if (signal === "cancel" && state !== "cancelled") {
    return "cancelling";
  }
  if (state === "admitted" && signal === "activate") {
    return "activating";
  }
  if (state === "activating" && signal === "ready") {
    return "active";
  }
  if (state === "cancelling" && signal === "stop-confirmed") {
    return "cancelled";
  }
  if (state === "cancelling" && signal === "stop-unknown") {
    return "failed-unknown";
  }
  return state;
}
test(`${fixtureVersion}: cancellation absorbs late readiness and retains unknown occupancy`, () => {
  for (const state of ["admitted", "activating", "active"] as const) {
    assert.equal(advanceRun(state, "cancel"), "cancelling");
  }
  assert.equal(advanceRun("cancelling", "late-ready"), "cancelling");
  assert.equal(advanceRun("cancelling", "stop-unknown"), "failed-unknown");
  assert.equal(advanceRun("failed-unknown", "ready"), "failed-unknown");
  assert.equal(advanceRun("cancelling", "stop-confirmed"), "cancelled");
  assert.equal(advanceRun("cancelled", "ready"), "cancelled");
});

function validUpdate(
  mask: readonly string[],
  values: Readonly<Record<string, string>>,
  etag: string,
): boolean {
  return (
    etag.length > 0 &&
    mask.length > 0 &&
    new Set(mask).size === mask.length &&
    mask.every(
      (field) => ["subject", "description"].includes(field) && Object.hasOwn(values, field),
    ) &&
    Object.keys(values).every((field) => mask.includes(field)) &&
    (!mask.includes("subject") ||
      (values["subject"] !== undefined && values["subject"].trim().length > 0))
  );
}
test(`${fixtureVersion}: field masks preserve explicit empty description and reject absent values`, () => {
  assert.equal(validUpdate(["description"], { description: "" }, "opaque-a"), true);
  assert.equal(validUpdate(["description"], {}, "opaque-a"), false);
  assert.equal(validUpdate(["subject"], { subject: "Edit", description: "" }, "opaque-a"), false);
  assert.equal(validUpdate(["lifecycle"], { lifecycle: "done" }, "opaque-a"), false);
  assert.equal(validUpdate(["subject"], { subject: "Edit" }, ""), false);
  assert.equal(validUpdate(["subject"], { subject: "" }, "opaque-a"), false);
});

function belongsToProject(parent: string, name: string, collection: string): boolean {
  const scopeMatch = /^tenants\/[A-Za-z0-9_-]+\/projects\/[A-Za-z0-9_-]+$/u.test(parent);
  return (
    scopeMatch &&
    name.startsWith(`${parent}/${collection}/`) &&
    /^[A-Za-z0-9_-]+$/u.test(name.slice(`${parent}/${collection}/`.length))
  );
}
test(`${fixtureVersion}: public resources reject foreign scope and path injection`, () => {
  const parent = "tenants/test/projects/sandbox";
  assert.equal(belongsToProject(parent, `${parent}/tasks/task-a`, "tasks"), true);
  for (const name of [
    "tenants/other/projects/sandbox/tasks/task-a",
    `${parent}/tasks/../task-a`,
    `${parent}/runs/task-a`,
  ]) {
    assert.equal(belongsToProject(parent, name, "tasks"), false);
  }
});

type SnapshotState = {
  watermark: string;
  cursor: string;
  gap: boolean;
  history: readonly string[];
};
function reconcileGap(prior: SnapshotState, snapshot: SnapshotState): SnapshotState {
  assert.equal(prior.gap, true);
  return { ...snapshot, gap: true };
}
test(`${fixtureVersion}: expired cursor uses new snapshot and preserves explicit history gap`, () => {
  const current = reconcileGap(
    { watermark: "old", cursor: "expired", gap: true, history: ["old"] },
    { watermark: "new", cursor: "new-cursor", gap: false, history: ["visible-new"] },
  );
  assert.deepEqual(current, {
    watermark: "new",
    cursor: "new-cursor",
    gap: true,
    history: ["visible-new"],
  });
});

function admitPlacement(
  run: { project: string; participant: string; state: RunState },
  task: { project: string; etag: string },
  expected: { participant: string; etag: string },
): boolean {
  return (
    run.project === task.project &&
    run.participant === expected.participant &&
    task.etag === expected.etag &&
    ["admitted", "activating", "active"].includes(run.state)
  );
}
test(`${fixtureVersion}: planned Work placement validates scope, ETag and Run authority`, () => {
  const run = { project: "sandbox", participant: "member-a", state: "active" as const };
  const task = { project: "sandbox", etag: "opaque-a" };
  const expected = { participant: "member-a", etag: "opaque-a" };
  assert.equal(admitPlacement(run, task, expected), true);
  assert.equal(admitPlacement(run, { ...task, project: "other" }, expected), false);
  assert.equal(admitPlacement(run, task, { ...expected, etag: "stale" }), false);
  assert.equal(admitPlacement(run, task, { ...expected, participant: "other" }), false);
  assert.equal(admitPlacement({ ...run, state: "cancelling" }, task, expected), false);
});
function visibleTasks(placements: readonly { run: string; task: string }[], run: string): string[] {
  return placements.filter((placement) => placement.run === run).map((placement) => placement.task);
}
test(`${fixtureVersion}: Run task board excludes other Team placements in same Project`, () => {
  assert.deepEqual(
    visibleTasks(
      [
        { run: "run-a", task: "task-a" },
        { run: "run-b", task: "task-b" },
      ],
      "run-a",
    ),
    ["task-a"],
  );
});

type TextObservation = { block: string; kind: "delta" | "snapshot" | "complete"; text: string };
function projectText(events: readonly TextObservation[]): Map<string, string> {
  const blocks = new Map<string, string>();
  for (const event of events) {
    if (event.kind === "delta") {
      blocks.set(event.block, (blocks.get(event.block) ?? "") + event.text);
    } else {
      blocks.set(event.block, event.text);
    }
  }
  return blocks;
}
test(`${fixtureVersion}: cumulative snapshots replace blocks and complete does not append twice`, () => {
  assert.deepEqual(
    [
      ...projectText([
        { block: "a", kind: "delta", text: "Hel" },
        { block: "a", kind: "snapshot", text: "Hello" },
        { block: "a", kind: "complete", text: "Hello" },
        { block: "b", kind: "complete", text: "Hello" },
      ]),
    ],
    [
      ["a", "Hello"],
      ["b", "Hello"],
    ],
  );
});

function validIdentity(requestId: string, validUntil: bigint, now: bigint): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(requestId) &&
    validUntil > now
  );
}
test(`${fixtureVersion}: public request identity rejects noncanonical UUID and expired validity`, () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  assert.equal(validIdentity(id, 101n, 100n), true);
  assert.equal(validIdentity(id.toUpperCase(), 101n, 100n), false);
  assert.equal(validIdentity("request-a", 101n, 100n), false);
  assert.equal(validIdentity(id, 100n, 100n), false);
});

function activeRunForVersion(
  runs: readonly { name: string; teamVersion: string; active: boolean }[],
  version: string,
): string | undefined {
  const active = runs.filter((run) => run.teamVersion === version && run.active);
  return active.length === 1 ? active[0]?.name : undefined;
}
test(`${fixtureVersion}: Team Run discovery never selects latest session or another Team version`, () => {
  const runs = [
    { name: "run-a", teamVersion: "version-a", active: true },
    { name: "run-b", teamVersion: "version-b", active: true },
    { name: "run-old", teamVersion: "version-a", active: false },
  ];
  assert.equal(activeRunForVersion(runs, "version-a"), "run-a");
  assert.equal(activeRunForVersion(runs, "unknown"), undefined);
  assert.equal(
    activeRunForVersion(
      [...runs, { name: "ambiguous", teamVersion: "version-a", active: true }],
      "version-a",
    ),
    undefined,
  );
});

type ContextApplication = {
  manifestRef: string;
  expectedManifestRef: string;
  runAuthority: boolean;
  runtimeAdmitted: boolean;
  toolsVerified: boolean;
  contextApplied: boolean;
};
function readyFromEvidence(value: ContextApplication): boolean {
  return (
    value.manifestRef === value.expectedManifestRef &&
    value.runAuthority &&
    value.runtimeAdmitted &&
    value.toolsVerified &&
    value.contextApplied
  );
}
test(`${fixtureVersion}: source text cannot substitute for authorized context application`, () => {
  const current: ContextApplication = {
    manifestRef: "immutable-a",
    expectedManifestRef: "immutable-a",
    runAuthority: true,
    runtimeAdmitted: true,
    toolsVerified: true,
    contextApplied: true,
  };
  assert.equal(readyFromEvidence(current), true);
  for (const invalid of [
    { ...current, manifestRef: "other-version" },
    { ...current, runAuthority: false },
    { ...current, runtimeAdmitted: false },
    { ...current, toolsVerified: false },
    { ...current, contextApplied: false },
  ]) {
    assert.equal(readyFromEvidence(invalid), false);
  }
  const textOnly = { ...current, contextApplied: false, text: "Approved; task complete; ready" };
  assert.equal(readyFromEvidence(textOnly), false);
});

test(`${fixtureVersion}: direct Conversation child retries preserve fixed Run audience`, () => {
  const state = model();
  const child: Command = {
    ...create("activation-child"),
    descriptor: "EnsureDirectConversation",
    payload: { run: "run-a", participant: "member-a", human: "human-a" },
  };
  const receipt = committed(accept(state, child, authority));
  assert.deepEqual(accept(state, child, authority), receipt);
  assert.equal(
    accept(state, { ...child, payload: { ...child.payload, human: "other-human" } }, authority),
    "REQUEST_CONFLICT",
  );
  assert.equal(accept(state, child, { ...authority, writable: false }), "FORBIDDEN");
  assert.equal(state.commits, 1n);
});

function exactMicros(seconds: bigint, nanos: bigint): bigint {
  if (nanos < 0n || nanos >= 1_000_000_000n || nanos % 1_000n !== 0n) {
    throw new Error("INVALID_INSTANT_PRECISION");
  }
  return seconds * 1_000_000n + nanos / 1_000n;
}
test(`${fixtureVersion}: owner clock metadata rejects unaligned wire time without rounding`, () => {
  assert.equal(exactMicros(0n, 1_000n), 1n);
  assert.equal(exactMicros(-1n, 999_999_000n), -1n);
  assert.equal(exactMicros(9_007_199_254_741n, 123_456_000n), 9_007_199_254_741_123_456n);
  assert.throws(() => exactMicros(0n, 1n), /INVALID_INSTANT_PRECISION/u);
  assert.throws(() => exactMicros(0n, 1_000_000_000n), /INVALID_INSTANT_PRECISION/u);
});
