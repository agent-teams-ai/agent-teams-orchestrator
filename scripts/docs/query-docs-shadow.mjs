import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findDocumentationDocuments } from "@agent-teams/engineering-foundation/document-authoring";

import { compareQueryShadow } from "./query-docs-shadow-lib.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptPath);
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const legacyQueryPath = path.join(scriptDirectory, "query-docs.mjs");
const profilePath = "architecture/foundation/document-authoring.yaml";
const maximumLegacyOutputBytes = 8 * 1024 * 1024;
function readLegacyDocuments(filters) {
  const filterArguments = Object.entries(filters).flatMap(([name, value]) => [
    `--${name}`,
    value,
  ]);
  const result = spawnSync(
    process.execPath,
    [legacyQueryPath, ...filterArguments, "--json"],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: maximumLegacyOutputBytes,
    },
  );
  if (result.error) {
    throw result.error;
  }
  if (![0, 1].includes(result.status)) {
    throw new Error(
      `legacy docs:query failed with exit code ${String(result.status)}: ${result.stderr.trim()}`,
    );
  }
  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed)) {
    throw new Error("legacy docs:query did not emit a JSON array");
  }
  if (result.status === 1 && parsed.length !== 0) {
    throw new Error("legacy docs:query returned exit code 1 with matches");
  }
  return parsed;
}

export async function runQueryShadow() {
  const probes = [
    { filters: {}, name: "complete catalog" },
    {
      filters: { owner: "architecture", status: "accepted" },
      name: "common AND filters",
    },
    {
      filters: { id: "shadow.missing.document" },
      name: "zero result",
    },
  ];
  const diagnostics = [];
  let documentCount = 0;
  for (const probe of probes) {
    const legacyDocuments = readLegacyDocuments(probe.filters);
    const foundationResult = await findDocumentationDocuments({
      consumerRoot: repositoryRoot,
      profilePath,
      ...(Object.keys(probe.filters).length === 0
        ? {}
        : { query: { filters: probe.filters } }),
    });
    const comparison = compareQueryShadow({
      foundationResult,
      legacyDocuments,
    });
    if (probe.name === "complete catalog") {
      documentCount = comparison.documentCount;
    }
    diagnostics.push(
      ...comparison.diagnostics.map(
        (diagnostic) => `${probe.name}: ${diagnostic}`,
      ),
    );
  }
  return {
    diagnostics,
    documentCount,
    ok: diagnostics.length === 0,
    probeCount: probes.length,
  };
}

async function main() {
  try {
    const result = await runQueryShadow();
    if (result.ok) {
      console.log(
        `Documentation query shadow parity passed: ${result.documentCount} documents across ${result.probeCount} probes.`,
      );
      return;
    }
    console.error("Documentation query shadow parity failed:");
    for (const diagnostic of result.diagnostics) {
      console.error(`- ${diagnostic}`);
    }
    process.exitCode = 1;
  } catch (error) {
    console.error(`Documentation query shadow failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] ?? "") === scriptPath) {
  await main();
}
