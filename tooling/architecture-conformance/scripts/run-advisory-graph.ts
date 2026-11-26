import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { foundationPackageRoot, loadFoundationManifest } from "./root-foundation.mjs";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

// A narrow consumer view of the public SDK result. Loading still uses only the
// root package's manifest-declared source-graph export, as other tooling does.
interface SourceGraph {
  readonly files: readonly string[];
  readonly edges: readonly { readonly from: string; readonly to: string }[];
  readonly external: readonly { readonly specifier: string }[];
  readonly unresolved: readonly { readonly specifier: string }[];
  readonly unresolvedRuntimeReferences: readonly unknown[];
  readonly parseFailures: readonly string[];
}
interface SourceGraphApi {
  observeSourceGraph(input: {
    readonly consumerRoot: string;
    readonly roots: readonly string[];
  }): Promise<SourceGraph>;
  stronglyConnectedComponents(
    edges: SourceGraph["edges"],
  ): readonly (readonly string[])[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function sourceGraphApi(value: unknown): value is SourceGraphApi {
  return record(value) && typeof value["observeSourceGraph"] === "function" &&
    typeof value["stronglyConnectedComponents"] === "function";
}

async function loadSourceGraph(): Promise<SourceGraphApi> {
  const manifest: unknown = loadFoundationManifest(repositoryRoot);
  if (!record(manifest) || manifest["name"] !== "@agent-teams/engineering-foundation" ||
    typeof manifest["version"] !== "string" || !/^4\.\d+\.\d+$/u.test(manifest["version"]) ||
    !record(manifest["exports"])) {
    throw new Error("Advisory graph requires the selected root Foundation 4 package.");
  }
  const entry = manifest["exports"]["./source-graph"];
  if (!record(entry) || entry["import"] !== "./dist/source-graph.js") {
    throw new Error("Foundation does not expose the supported public source-graph entry.");
  }
  const api: unknown = await import(pathToFileURL(
    join(foundationPackageRoot(repositoryRoot), entry["import"]),
  ).href);
  if (!sourceGraphApi(api)) {
    throw new Error("Installed Foundation source-graph exports are incomplete.");
  }
  return api;
}

export function buildGraphReport(
  graph: SourceGraph,
  components: readonly (readonly string[])[],
) {
  const selfImports = new Set(graph.edges.filter(({ from, to }) => from === to).map(({ from }) => from));
  return {
    schemaVersion: 1,
    authority: "advisory-local-source-graph",
    files: graph.files,
    localEdges: graph.edges.length,
    cycles: components.filter((members) => members.length > 1 || selfImports.has(members[0] ?? "")),
    unresolved: graph.unresolved,
    unresolvedRuntimeReferences: graph.unresolvedRuntimeReferences,
    parseFailures: graph.parseFailures,
    external: graph.external,
    limits: "Bare packages and tsconfig aliases remain external facts. The blocking source-dependency capability owns package/export/layer policy.",
  };
}

/** Fixture qualification only; production graph findings remain advisory. */
export function requireCompleteAcyclicGraph(report: ReturnType<typeof buildGraphReport>): void {
  if (report.cycles.length > 0) {
    throw new Error(`no-circular-dependencies: ${JSON.stringify(report.cycles)}`);
  }
  if (report.unresolved.length > 0 || report.unresolvedRuntimeReferences.length > 0 ||
    report.parseFailures.length > 0) {
    throw new Error(`incomplete-local-source-graph: ${JSON.stringify(report)}`);
  }
}

export async function observeAdvisoryGraph(
  consumerRoot = repositoryRoot,
  roots: readonly string[] = ["apps", "packages"].filter((root) => existsSync(join(consumerRoot, root))),
) {
  if (roots.length === 0) {
    throw new Error("Advisory graph has no source roots to observe.");
  }
  const api = await loadSourceGraph();
  const graph = await api.observeSourceGraph({ consumerRoot, roots });
  return buildGraphReport(graph, api.stronglyConnectedComponents(graph.edges));
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && resolve(entrypoint) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await observeAdvisoryGraph(), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
