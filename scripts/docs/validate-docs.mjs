import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";
import YAML from "yaml";

import {
  listRepositoryFiles,
  matchingCodeAnchorFiles,
  validateCodeAnchorPattern,
} from "./code-anchors.mjs";
import { discoverGovernedMarkdown } from "./document-files.mjs";
import { validateDocumentIndexes } from "./document-indexes.mjs";
import {
  validateLocalLinks,
} from "./document-links.mjs";
import { parseFrontmatter, parseMarkdown } from "./document-parser.mjs";
import { validateDocumentRelations } from "./document-relations.mjs";
import { validateMermaid } from "./mermaid-runner.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = process.env.DOCS_REPOSITORY_ROOT
  ? path.resolve(process.env.DOCS_REPOSITORY_ROOT)
  : path.resolve(scriptDirectory, "../..");
const docsRoot = path.join(repositoryRoot, "docs");
const metadataSchemaPath = path.join(docsRoot, "metadata.schema.json");
const ownerCatalogPath = path.join(docsRoot, "owners.yaml");
const entrypoint = path.join(docsRoot, "README.md");
const mermaidValidatorPath = path.join(scriptDirectory, "validate-mermaid.mjs");
const adrApprovalPolicyStart = 34;

const errors = [];
function relative(filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join("/");
}

function parseDocument(filePath, tree) {
  const { error, metadata } = parseFrontmatter(tree);
  if (error) {
    errors.push(`${relative(filePath)}: ${error}`);
  }
  return { metadata, tree };
}

function validateCodeAnchors(document, repositoryFiles) {
  if (!Array.isArray(document.metadata?.code_anchors)) {
    return;
  }

  const patterns = new Set();
  for (const anchor of document.metadata.code_anchors) {
    if (!anchor || typeof anchor !== "object") {
      continue;
    }
    const patternError = validateCodeAnchorPattern(anchor.pattern);
    if (patternError) {
      errors.push(
        `${relative(document.filePath)}: invalid code anchor ${JSON.stringify(anchor.pattern)}: ${patternError}`,
      );
      continue;
    }
    if (patterns.has(anchor.pattern)) {
      errors.push(
        `${relative(document.filePath)}: duplicate code anchor pattern ${anchor.pattern}`,
      );
      continue;
    }
    patterns.add(anchor.pattern);
    if (matchingCodeAnchorFiles(anchor.pattern, repositoryFiles).length === 0) {
      errors.push(
        `${relative(document.filePath)}: stale code anchor ${anchor.pattern} matches no repository files`,
      );
    }
  }
}

function validateDocumentStructure(filePath, tree) {
  const topLevelHeadings = [];
  visit(tree, "heading", (node) => {
    if (node.depth === 1) {
      topLevelHeadings.push(node);
    }
  });

  if (topLevelHeadings.length !== 1) {
    errors.push(
      `${relative(filePath)}: expected exactly one level-one heading, found ${topLevelHeadings.length}`,
    );
  }

  const firstContent = tree.children.find(
    (node) => node.type !== "yaml" && node.type !== "definition",
  );
  if (firstContent?.type !== "heading" || firstContent.depth !== 1) {
    errors.push(
      `${relative(filePath)}: first content node must be the level-one document title`,
    );
  }
}

function mermaidDiagrams(tree, filePath) {
  const diagrams = [];
  let diagramIndex = 0;

  visit(tree, "code", (node) => {
    if (node.lang?.toLowerCase() !== "mermaid") {
      return;
    }

    diagramIndex += 1;
    diagrams.push({
      key: `${relative(filePath)}:${diagramIndex}`,
      source: node.value,
    });
  });

  return diagrams;
}

function validateFilename(document) {
  const { filePath, metadata } = document;
  if (!metadata) {
    return;
  }

  const basename = path.basename(filePath);
  if (metadata.type === "index" && basename !== "README.md") {
    errors.push(
      `${relative(filePath)}: index documents must use the directory README.md`,
    );
  }

  if (metadata.type === "adr") {
    const match = basename.match(/^(\d{4})-[a-z0-9-]+\.md$/);
    if (!match || metadata.id !== `ADR-${match?.[1]}`) {
      errors.push(
        `${relative(filePath)}: ADR filename and id ${metadata.id} do not match`,
      );
    }
  }

  if (metadata.type === "open-decision") {
    const match = basename.match(/^(OD-\d{3})-[a-z0-9-]+\.md$/);
    if (!match || metadata.id !== match?.[1]) {
      errors.push(
        `${relative(filePath)}: open-decision filename and id ${metadata.id} do not match`,
      );
    }
  }
}

function validateDocumentPlacement(document) {
  const { filePath, metadata } = document;
  if (!metadata) {
    return;
  }

  const parent = path.dirname(filePath);
  const basename = path.basename(filePath);
  const repositoryPath = relative(filePath);
  const expectedParentByType = {
    adr: path.join(docsRoot, "decisions"),
    "domain-standard": path.join(docsRoot, "domain"),
    "open-decision": path.join(docsRoot, "open-decisions"),
    research: path.join(docsRoot, "research"),
    template: path.join(docsRoot, "templates"),
  };
  const expectedParent = expectedParentByType[metadata.type];

  if (expectedParent && parent !== expectedParent) {
    errors.push(
      `${repositoryPath}: type ${metadata.type} must be placed under ${relative(expectedParent)}`,
    );
  }

  if (
    metadata.type === "bounded-context" &&
    (!filePath.startsWith(
      `${path.join(docsRoot, "domain/contexts")}${path.sep}`,
    ) ||
      basename !== "README.md")
  ) {
    errors.push(
      `${repositoryPath}: bounded-context dossier must be docs/domain/contexts/<context>/README.md`,
    );
  }

  if (
    metadata.type === "feature" &&
    !/^(?:apps|packages|tooling)\/.+\/src\/features\/.+\/README\.md$/.test(
      repositoryPath,
    )
  ) {
    errors.push(
      `${repositoryPath}: feature documentation must be colocated under src/features/**/README.md`,
    );
  }

  if (
    metadata.type === "glossary" &&
    filePath !== path.join(docsRoot, "glossary.md")
  ) {
    errors.push(`${repositoryPath}: glossary must be docs/glossary.md`);
  }
}

function validateRequiredHeadings(document) {
  const { filePath, metadata, tree } = document;
  if (!metadata) {
    return;
  }

  const headings = new Set();
  visit(tree, "heading", (node) => {
    if (node.depth === 2) {
      headings.add(toString(node).trim().toLowerCase());
    }
  });

  function requireHeading(label) {
    if (!headings.has(label.toLowerCase())) {
      errors.push(`${relative(filePath)}: missing required heading "## ${label}"`);
    }
  }

  function requireOneOf(labels, description) {
    if (!labels.some((label) => headings.has(label.toLowerCase()))) {
      errors.push(
        `${relative(filePath)}: missing required ${description}; expected one of ${labels.map((label) => `"## ${label}"`).join(", ")}`,
      );
    }
  }

  if (metadata.type === "adr") {
    requireHeading("Context");
    requireHeading("Decision");
    requireHeading("Consequences");
    if (![...headings].some((heading) => heading.endsWith("alternatives"))) {
      errors.push(
        `${relative(filePath)}: ADR requires a level-two alternatives section`,
      );
    }
  }

  if (metadata.type === "open-decision") {
    requireHeading("Resolution");
    requireOneOf(
      ["Decision required", "Decisions required", "Remaining questions"],
      "decision-question section",
    );
  }

  if (metadata.type === "bounded-context" && metadata.status === "accepted") {
    for (const heading of [
      "Domain vision",
      "Scope",
      "Ubiquitous Language",
      "Invariants and business rules",
      "Aggregates and consistency boundaries",
      "Concurrency and conflict model",
      "Context relationships",
      "Verification scenarios",
    ]) {
      requireHeading(heading);
    }
  }

  if (metadata.type === "feature" && metadata.status === "accepted") {
    requireHeading("Scope");
    requireHeading("Public surface");
    requireHeading("Verification");
  }

  if (metadata.type === "contract" && metadata.status === "accepted") {
    for (const heading of [
      "Owner and consumers",
      "Machine-readable source",
      "Compatibility and versioning",
      "Conformance fixtures",
    ]) {
      requireHeading(heading);
    }
  }

  if (metadata.type === "runbook") {
    for (const heading of [
      "Scope and safety",
      "Symptoms",
      "Diagnosis",
      "Recovery",
      "Verification",
      "Rollback or escalation",
    ]) {
      requireHeading(heading);
    }
  }
}

function validateAdrApproval(document) {
  const { filePath, metadata } = document;
  if (metadata?.type !== "adr") {
    if (metadata?.approved_by || metadata?.accepted_at) {
      errors.push(
        `${relative(filePath)}: approval metadata is allowed only on ADRs`,
      );
    }
    return;
  }

  const adrNumber = Number.parseInt(metadata.id.slice("ADR-".length), 10);
  const governedByApprovalPolicy = adrNumber >= adrApprovalPolicyStart;
  const isAcceptedDecision =
    metadata.status === "accepted" || metadata.status === "superseded";
  const hasApprovedBy = typeof metadata.approved_by === "string";
  const hasAcceptedAt = typeof metadata.accepted_at === "string";

  if (metadata.status === "proposed" && (hasApprovedBy || hasAcceptedAt)) {
    errors.push(
      `${relative(filePath)}: proposed ADR must not declare approved_by or accepted_at`,
    );
  }

  if (
    governedByApprovalPolicy &&
    isAcceptedDecision &&
    (!hasApprovedBy || !hasAcceptedAt)
  ) {
    errors.push(
      `${relative(filePath)}: accepted ADR-${String(adrNumber).padStart(4, "0")} requires approved_by and accepted_at`,
    );
  }
}

async function validateDocumentDiagrams(documents) {
  const diagrams = documents.flatMap((document) =>
    mermaidDiagrams(document.tree, document.filePath),
  );
  if (diagrams.length === 0 || process.env.DOCS_SKIP_MERMAID === "1") {
    return;
  }
  const mermaidResult = await validateMermaid(diagrams, {
    repositoryRoot,
    validatorPath: mermaidValidatorPath,
  });
  if (!mermaidResult.results) {
    errors.push(`Mermaid validation failed: ${mermaidResult.error}`);
    return;
  }
  for (const result of mermaidResult.results) {
    if (!result.valid) {
      errors.push(
        `${result.key.replace(/:(\d+)$/, ": Mermaid diagram $1")} is invalid: ${result.error}`,
      );
    }
  }
}

async function main() {
  const { docsMarkdownFiles, governedMarkdownFiles } =
    await discoverGovernedMarkdown(repositoryRoot);
  const allMarkdownFiles = [
    path.join(repositoryRoot, "README.md"),
    path.join(repositoryRoot, "AGENTS.md"),
    ...governedMarkdownFiles,
  ];

  const schema = JSON.parse(await readFile(metadataSchemaPath, "utf8"));
  const ownerCatalog = YAML.parse(await readFile(ownerCatalogPath, "utf8"));
  if (
    ownerCatalog?.version !== 1 ||
    !ownerCatalog.owners ||
    typeof ownerCatalog.owners !== "object" ||
    Array.isArray(ownerCatalog.owners)
  ) {
    errors.push(
      `${relative(ownerCatalogPath)}: expected version 1 with an owners mapping`,
    );
  }
  const registeredOwners = new Set(
    Object.keys(ownerCatalog?.owners ?? {}),
  );
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  addFormats(ajv);
  const validateMetadata = ajv.compile(schema);

  const documents = [];
  const documentsByPath = new Map();
  const documentsById = new Map();
  const markdownTrees = new Map();
  const repositoryFiles = await listRepositoryFiles(repositoryRoot);

  for (const filePath of allMarkdownFiles) {
    const source = await readFile(filePath, "utf8");
    const tree = parseMarkdown(source);
    markdownTrees.set(filePath, tree);
    validateDocumentStructure(filePath, tree);
  }

  for (const filePath of governedMarkdownFiles) {
    const parsed = parseDocument(filePath, markdownTrees.get(filePath));
    const document = {
      filePath,
      ...parsed,
    };
    documents.push(document);
    documentsByPath.set(filePath, document);

    if (!parsed.metadata) {
      continue;
    }

    if (!validateMetadata(parsed.metadata)) {
      for (const validationError of validateMetadata.errors ?? []) {
        errors.push(
          `${relative(filePath)}${validationError.instancePath || ""}: ${validationError.message}`,
        );
      }
    }

    const existing = documentsById.get(parsed.metadata.id);
    if (existing) {
      errors.push(
        `${relative(filePath)}: duplicate id ${parsed.metadata.id}; already used by ${relative(existing.filePath)}`,
      );
    } else {
      documentsById.set(parsed.metadata.id, document);
    }

    if (!registeredOwners.has(parsed.metadata.owner)) {
      errors.push(
        `${relative(filePath)}: owner ${parsed.metadata.owner} is not registered in ${relative(ownerCatalogPath)}`,
      );
    }

    validateFilename(document);
    validateDocumentPlacement(document);
    validateRequiredHeadings(document);
    validateAdrApproval(document);
    validateCodeAnchors(document, repositoryFiles);
  }

  validateDocumentRelations({
    documents,
    documentsById,
    errors,
    relative,
  });

  await validateLocalLinks({
    allMarkdownFiles,
    documents,
    documentsByPath,
    entrypoint,
    errors,
    markdownTrees,
    relative,
    repositoryRoot,
  });

  await validateDocumentIndexes({
    docsRoot,
    documentsByPath,
    errors,
    markdownFiles: docsMarkdownFiles,
    relative,
    repositoryRoot,
  });

  await validateDocumentDiagrams(documents);

  if (errors.length > 0) {
    for (const error of errors.toSorted()) {
      console.error(`ERROR ${error}`);
    }
    console.error(`\nDocumentation validation failed with ${errors.length} error(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Documentation validation passed: ${documents.length} documents, ${documentsById.size} unique IDs.`,
  );
}

await main();
