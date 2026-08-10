import { writeGeneratedArtifacts } from "./generated-artifacts.mjs";
import { loadSpecs } from "./load-specs.mjs";

writeGeneratedArtifacts(loadSpecs({ allowMissingProofArtifacts: true }));
