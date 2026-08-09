import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = path.resolve(scriptDirectory, "../..");
export const executableSpecRoot = path.join(
  repositoryRoot,
  "architecture/executable-specs",
);
export const schemaPath = path.join(
  executableSpecRoot,
  "orchestrator-state-machine.schema.json",
);
export const specPaths = [
  path.join(executableSpecRoot, "orchestration-project-lifecycle.json"),
  path.join(executableSpecRoot, "run-authority-state.json"),
];
export const generatedDirectory = path.join(executableSpecRoot, "generated");
