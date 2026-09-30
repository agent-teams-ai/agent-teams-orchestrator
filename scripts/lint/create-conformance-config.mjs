import { randomUUID } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export function createConformanceOxlintConfig(repositoryRoot) {
  const rootConfigPath = path.join(repositoryRoot, ".oxlintrc.json");
  const rootConfig = JSON.parse(readFileSync(rootConfigPath, "utf8"));
  const commonConfig = JSON.parse(readFileSync(path.join(repositoryRoot, ".oxlintrc.common.json"), "utf8"));
  const filePath = path.join(
    repositoryRoot,
    `.oxlintrc.conformance.${process.pid}.${randomUUID()}.json`,
  );

  writeFileSync(
    filePath,
    `${JSON.stringify({ ...rootConfig, ignorePatterns: [] }, null, 2)}\n`,
  );
  const typedFilePath = filePath.replace(/\.json$/u, ".typed.json");
  writeFileSync(typedFilePath, `${JSON.stringify({
    extends: ["./.oxlintrc.type-aware.json"],
    overrides: [{
      files: ["tooling/lint-fixtures/**/*.{ts,tsx,mts,cts}"],
      rules: commonConfig.overrides.find((entry) =>
        entry.files.includes("packages/**/src/**/*.{ts,tsx,mts,cts}"))?.rules,
    }],
  }, null, 2)}\n`);

  return {
    filePath,
    typedFilePath,
    dispose: () => {
      rmSync(filePath, { force: true });
      rmSync(typedFilePath, { force: true });
    },
  };
}
