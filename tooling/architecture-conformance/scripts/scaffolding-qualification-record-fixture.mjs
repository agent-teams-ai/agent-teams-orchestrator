import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import foundationManifest from "@agent-teams/engineering-foundation/package.json" with { type: "json" };
import Ajv2020 from "ajv/dist/2020.js";
import YAML from "yaml";

function requireSuccess(label, result) {
  assert.equal(result.status, 0, `${label} failed:\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  return result;
}

export async function verifyQualificationRecord(repositoryRoot) {
  const schema = JSON.parse(
    await readFile(
      path.join(
        repositoryRoot,
        "architecture/foundation/scaffolding-qualification.schema.json",
      ),
      "utf8",
    ),
  );
  const record = YAML.parse(
    await readFile(
      path.join(
        repositoryRoot,
        "architecture/foundation/scaffolding-qualification.yaml",
      ),
      "utf8",
    ),
  );
  const config = YAML.parse(
    await readFile(
      path.join(repositoryRoot, "architecture/foundation/scaffolding.yaml"),
      "utf8",
    ),
  );
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  assert.equal(validate(record), true, JSON.stringify(validate.errors, null, 2));
  const versionCases = [
    ["0.16.0-rc.0+consumer.1", true], ["0.16.0+consumer.1", true],
    ["0.16", false], ["01.16.0", false], ["0.16.0-01", false],
    ["0.16.0-", false], ["0.16.0+", false], ["0.16.0_rc.0", false],
  ];
  for (const [foundationVersion, expected] of versionCases) {
    assert.equal(validate({ ...record, foundationVersion }), expected,
      `${foundationVersion} has an unexpected SemVer result`);
  }
  const manifest = JSON.parse(
    await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
  );
  assert.equal(
    foundationManifest.version,
    manifest.devDependencies["@agent-teams/engineering-foundation"],
  );
  // This record is historical 0.21.0 evidence, not admission for today's pin.
  // Freeze its content across Git checkout line endings; the remaining checks
  // execute fresh candidate proof without changing this historical record.
  assert.equal(createHash("sha256").update((await readFile(path.join(
    repositoryRoot, "architecture/foundation/scaffolding-qualification.yaml",
  ), "utf8")).replaceAll("\r\n", "\n")).digest("hex"), "f50530bf80f1612783c11ff09683dd5621d8fb6257414855ca7462f9c14cab8d");
  const composition = config.compositions.find(
    (candidate) => candidate.id === record.composition.id,
  );
  assert.ok(composition, "qualified Composition is missing from canonical config");
  assert.equal(record.consumer, config.projectId);
  assert.equal(record.composition.targetCatalogPath, config.targetCatalogPath);
  assert.equal(record.recipe.id, composition.recipe.ref.id);
  assert.equal(
    record.recipe.contractVersion,
    composition.recipe.ref.contractVersion,
  );
  requireSuccess(
    "ignored local scaffolding state",
    spawnSync(
      "git",
      ["check-ignore", "-q", ".agent-teams-local/scaffolding-transaction.json"],
      { cwd: repositoryRoot, encoding: "utf8" },
    ),
  );
  const trackedLocalState = requireSuccess(
    "tracked local scaffolding state query",
    spawnSync("git", ["ls-files", "--", ".agent-teams-local"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }),
  );
  assert.equal(
    trackedLocalState.stdout.trim(),
    "",
    ".agent-teams-local must never contain tracked files",
  );
}
