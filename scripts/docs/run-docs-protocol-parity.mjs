import { spawn } from "node:child_process";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const rawArguments = process.argv.slice(2);
const [packageRootArgument] = rawArguments[0] === "--"
  ? rawArguments.slice(1)
  : rawArguments;
if (!packageRootArgument) {
  throw new Error(
    "Usage: pnpm docs:protocol:parity -- /absolute/path/to/packages/docs-protocol",
  );
}
const packageRoot = await realpath(path.resolve(packageRootArgument));
const child = spawn(
  process.execPath,
  ["--test", "--test-concurrency=1", "scripts/docs/docs-protocol-parity.test.mjs"],
  {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      DOCS_PROTOCOL_PACKAGE_ROOT: packageRoot,
      REQUIRE_DOCS_PROTOCOL_PARITY: "1",
    },
    stdio: "inherit",
  },
);
child.once("error", (error) => {
  throw error;
});
const code = await new Promise((resolve) => {
  child.once("close", resolve);
});
process.exitCode = typeof code === "number" ? code : 1;
