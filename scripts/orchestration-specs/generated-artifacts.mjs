import fs from "node:fs";
import path from "node:path";

import { generatedDirectory } from "./paths.mjs";
import { renderMermaid } from "./render-mermaid.mjs";

const filenameFor = (spec) => `${spec.id.replace("orchestrator.", "")}.mmd`;

export const expectedGeneratedArtifacts = (specs) =>
  new Map(
    specs.map((spec) => [
      path.join(generatedDirectory, filenameFor(spec)),
      renderMermaid(spec),
    ]),
  );

export const writeGeneratedArtifacts = (specs) => {
  fs.mkdirSync(generatedDirectory, { recursive: true });
  for (const [artifactPath, content] of expectedGeneratedArtifacts(specs)) {
    fs.writeFileSync(artifactPath, content);
  }
};

export const assertGeneratedArtifactsCurrent = (specs) => {
  for (const [artifactPath, expected] of expectedGeneratedArtifacts(specs)) {
    const actual = fs.readFileSync(artifactPath, "utf8");
    if (actual !== expected) {
      throw new Error(
        `${path.relative(process.cwd(), artifactPath)} is stale; run pnpm specs:generate`,
      );
    }
  }
};
