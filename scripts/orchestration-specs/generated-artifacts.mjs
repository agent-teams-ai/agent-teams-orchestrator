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

export const assertGeneratedArtifactInventory = (actualNames, expectedPaths) => {
  const actualMermaidNames = actualNames
    .filter((name) => name.endsWith(".mmd"))
    .toSorted();
  const expectedMermaidNames = expectedPaths
    .map((artifactPath) => path.basename(artifactPath))
    .toSorted();

  if (JSON.stringify(actualMermaidNames) !== JSON.stringify(expectedMermaidNames)) {
    throw new Error(
      `Generated Mermaid inventory differs: expected ${expectedMermaidNames.join(", ")}; found ${actualMermaidNames.join(", ")}`,
    );
  }
};

export const assertGeneratedArtifactsCurrent = (specs) => {
  const expectedArtifacts = expectedGeneratedArtifacts(specs);
  assertGeneratedArtifactInventory(
    fs.readdirSync(generatedDirectory),
    [...expectedArtifacts.keys()],
  );

  for (const [artifactPath, expected] of expectedArtifacts) {
    const actual = fs.readFileSync(artifactPath, "utf8");
    if (actual !== expected) {
      throw new Error(
        `${path.relative(process.cwd(), artifactPath)} is stale; run pnpm specs:generate`,
      );
    }
  }
};
