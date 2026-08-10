import path from "node:path";

import {
  assertGeneratedArtifactsCurrent,
  expectedGeneratedArtifacts,
} from "./generated-artifacts.mjs";
import { loadSchema, loadSpecs } from "./load-specs.mjs";
import { validateMermaid } from "./mermaid-validator.mjs";
import { repositoryRoot } from "./paths.mjs";
import {
  assertOwnedSemantics,
  assertSchemaValid,
  createSchemaValidator,
} from "./validate-specs.mjs";

const specs = loadSpecs();
const validate = createSchemaValidator(loadSchema());

for (const spec of specs) {
  assertSchemaValid(validate, spec);
  assertOwnedSemantics(spec);
}

assertGeneratedArtifactsCurrent(specs);

const mermaidResult = await validateMermaid(
  [...expectedGeneratedArtifacts(specs)]
    .filter(([key]) => key.endsWith(".mmd"))
    .map(([key, source]) => ({ key, source })),
  {
    repositoryRoot,
    validatorPath: path.join(repositoryRoot, "scripts/docs/validate-mermaid.mjs"),
  },
);

if (mermaidResult.error !== null) {
  throw new Error(`Mermaid validation failed: ${mermaidResult.error}`);
}

for (const result of mermaidResult.results) {
  if (!result.valid) {
    throw new Error(`${result.key} is invalid Mermaid: ${result.error}`);
  }
}
