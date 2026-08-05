import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const packageRoot = path.resolve(import.meta.dirname, "..");
const pnpmCli = process.env.npm_execpath;
const typescriptCli = path.resolve(
  packageRoot,
  "../../../node_modules/typescript/bin/tsc",
);

function run(command, arguments_, cwd) {
  const result = spawnSync(command, arguments_, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  assert.equal(
    result.status,
    0,
    `${command} ${arguments_.join(" ")} failed:\n${result.stdout ?? ""}${result.stderr ?? ""}`,
  );
  return result.stdout ?? "";
}

function runPnpm(arguments_, cwd) {
  assert.ok(pnpmCli, "pnpm lifecycle CLI path is required");
  return run(process.execPath, [pnpmCli, ...arguments_], cwd);
}

test("packed artifact is installable and exposes runtime and declarations", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "local-host-control-pack-"),
  );
  const packRoot = path.join(temporaryRoot, "pack");
  const consumerRoot = path.join(temporaryRoot, "consumer");

  try {
    await Promise.all([
      mkdir(packRoot, { recursive: true }),
      mkdir(consumerRoot, { recursive: true }),
    ]);
    const output = runPnpm(
      ["pack", "--json", "--pack-destination", packRoot],
      packageRoot,
    );
    const trimmedOutput = output.trim();
    const nestedJsonStart = trimmedOutput.lastIndexOf("\n{");
    const jsonStart = trimmedOutput.startsWith("{")
      ? 0
      : nestedJsonStart >= 0
        ? nestedJsonStart + 1
        : -1;
    assert.ok(jsonStart >= 0, `pnpm pack did not return JSON:\n${output}`);
    const packed = JSON.parse(trimmedOutput.slice(jsonStart));
    const packedPaths = packed.files.map(({ path: packedPath }) => packedPath);
    assert.ok(packedPaths.includes("dist/index.js"));
    assert.ok(packedPaths.includes("dist/index.d.ts"));
    assert.equal(packedPaths.some((packedPath) => packedPath.startsWith("src/")), false);

    await writeFile(
      path.join(temporaryRoot, "package.json"),
      JSON.stringify({ private: true }),
    );
    await writeFile(
      path.join(temporaryRoot, "pnpm-workspace.yaml"),
      "packages:\n  - consumer\n",
    );
    const packedSpecifier = `file:${path
      .relative(consumerRoot, packed.filename)
      .replaceAll("\\", "/")}`;
    await writeFile(
      path.join(consumerRoot, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        dependencies: {
          "@agent-teams/local-host-control": packedSpecifier,
        },
      }),
    );
    runPnpm(["install", "--offline", "--ignore-scripts"], temporaryRoot);
    run(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        "const api = await import('@agent-teams/local-host-control'); if (typeof api.createHostDiscovery !== 'function') process.exit(1);",
      ],
      consumerRoot,
    );
    await writeFile(
      path.join(consumerRoot, "index.mts"),
      'import { targetId, type TargetId } from "@agent-teams/local-host-control";\nconst value: TargetId = targetId("packed-consumer");\nvoid value;\n',
    );
    await writeFile(
      path.join(consumerRoot, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          strict: true,
        },
        include: ["index.mts"],
      }),
    );
    run(
      process.execPath,
      [typescriptCli, "--project", "tsconfig.json", "--pretty", "false"],
      consumerRoot,
    );

    const declaration = await readFile(
      path.join(
        consumerRoot,
        "node_modules/@agent-teams/local-host-control/dist/index.d.ts",
      ),
      "utf8",
    );
    assert.match(declaration, /host-discovery\/index\.js/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
