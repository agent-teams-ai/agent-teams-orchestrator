import fs from "node:fs";
import path from "node:path";

import { getSimplePaths } from "@xstate/graph";

import { deriveMachine } from "./derive-machine.mjs";
import {
  generatedDiagramPath,
  generatedDirectory,
  generatedPathsPath,
} from "./paths.mjs";
import { renderCombinedMermaid } from "./render-mermaid.mjs";

const renderPathEvidence = (specs) => {
  const models = specs.map((spec) => ({
    id: spec.id,
    paths: getSimplePaths(deriveMachine(spec))
      .map((simplePath) => ({
        targetState: simplePath.state.value,
        events: simplePath.steps
          .map((step) => step.event.type)
          .filter((event) => event !== "xstate.init"),
      }))
      .toSorted((left, right) => left.targetState.localeCompare(right.targetState)),
  }));

  return `${JSON.stringify(
    {
      schemaVersion: 1,
      evidenceKind: "derived-independent-xstate-simple-paths",
      composition: "independent-machines-no-cross-product",
      models,
    },
    null,
    2,
  )}\n`;
};

export const expectedGeneratedArtifacts = (specs) =>
  new Map([
    [generatedDiagramPath, renderCombinedMermaid(specs)],
    [generatedPathsPath, renderPathEvidence(specs)],
  ]);

export const writeGeneratedArtifacts = (specs) => {
  fs.mkdirSync(generatedDirectory, { recursive: true });
  for (const [artifactPath, content] of expectedGeneratedArtifacts(specs)) {
    fs.writeFileSync(artifactPath, content);
  }
};

export const assertGeneratedArtifactInventory = (actualNames, expectedPaths) => {
  const actualGeneratedNames = actualNames.toSorted();
  const expectedGeneratedNames = expectedPaths
    .map((artifactPath) => path.basename(artifactPath))
    .toSorted();

  if (
    JSON.stringify(actualGeneratedNames) !== JSON.stringify(expectedGeneratedNames)
  ) {
    throw new Error(
      `Generated artifact inventory differs: expected ${expectedGeneratedNames.join(", ")}; found ${actualGeneratedNames.join(", ")}`,
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
