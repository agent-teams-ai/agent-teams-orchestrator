import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = path.resolve(scriptDirectory, "../..");
export const executableSpecRoot = path.join(
  repositoryRoot,
  "architecture/executable-specs",
);
export const generatedDirectory = path.join(executableSpecRoot, "generated");
export const foundationConfigPath = path.join(repositoryRoot, "foundation.config.yaml");
