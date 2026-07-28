import { randomUUID } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export function createConformanceOxlintConfig(repositoryRoot) {
  const rootConfigPath = path.join(repositoryRoot, ".oxlintrc.json");
  const rootConfig = JSON.parse(readFileSync(rootConfigPath, "utf8"));
  const filePath = path.join(
    repositoryRoot,
    `.oxlintrc.conformance.${process.pid}.${randomUUID()}.json`,
  );

  writeFileSync(
    filePath,
    `${JSON.stringify({ ...rootConfig, ignorePatterns: [] }, null, 2)}\n`,
  );

  return {
    filePath,
    dispose: () => {
      rmSync(filePath, { force: true });
    },
  };
}
