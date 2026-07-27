import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";
import YAML from "yaml";

import {
  listRepositoryFiles,
  matchingCodeAnchorFiles,
  validateCodeAnchorPattern,
} from "./code-anchors.mjs";
import { discoverGovernedMarkdown } from "./document-files.mjs";
import { parseFrontmatter, parseMarkdown } from "./document-parser.mjs";

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

function headingAnchors(tree) {
  const anchors = new Set();
  const slugger = new GithubSlugger();
  visit(tree, "heading", (node) => {
    anchors.add(slugger.slug(toString(node)));
  });

  return anchors;
}

function markdownLinks(tree) {
  const links = [];
  visit(tree, (node) => {
    if (
      (node.type === "link" ||
        node.type === "image" ||
        node.type === "definition") &&
      typeof node.url === "string"
    ) {
      links.push(node.url);
    }
  });

  return links;
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

function resolveMarkdownTarget(sourcePath, rawTarget) {
  if (
    /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(rawTarget) ||
    rawTarget.startsWith("/")
  ) {
    return null;
  }

  const [rawPath, rawAnchor = ""] = rawTarget.split("#", 2);
  let targetPath = rawPath
    ? path.resolve(path.dirname(sourcePath), decodeURIComponent(rawPath))
    : sourcePath;

  const repositoryRelative = path.relative(repositoryRoot, targetPath);
  if (
    repositoryRelative === ".." ||
    repositoryRelative.startsWith(`..${path.sep}`)
  ) {
    return {
      anchor: decodeURIComponent(rawAnchor).toLowerCase(),
      escapedRepository: true,
      targetPath,
    };
  }

  return {
    anchor: decodeURIComponent(rawAnchor).toLowerCase(),
    escapedRepository: false,
    targetPath,
  };
}

async function normalizeExistingTarget(targetPath) {
  try {
    const targetStat = await stat(targetPath);
    if (targetStat.isDirectory()) {
      return path.join(targetPath, "README.md");
    }
    return targetPath;
  } catch {
    return targetPath;
  }
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

function linkedLocalMarkdownPaths(indexDocument) {
  return new Set(
    markdownLinks(indexDocument.tree)
      .map((target) => resolveMarkdownTarget(indexDocument.filePath, target))
      .filter((target) => target && !target.escapedRepository)
      .map(({ targetPath }) => path.normalize(targetPath)),
  );
}

async function validateDirectoryIndexes(markdownFiles, documentsByPath) {
  const directories = new Set([docsRoot]);
  for (const filePath of markdownFiles) {
    let directory = path.dirname(filePath);
    while (
      directory === docsRoot ||
      directory.startsWith(`${docsRoot}${path.sep}`)
    ) {
      directories.add(directory);
      if (directory === docsRoot) {
        break;
      }
      directory = path.dirname(directory);
    }
  }

  for (const directory of [...directories].sort()) {
    const entries = await readdir(directory, { withFileTypes: true });
    const directDocuments = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          path.extname(entry.name) === ".md" &&
          entry.name !== "README.md",
      )
      .map((entry) => path.join(directory, entry.name));
    const childDocumentationDirectories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(directory, entry.name))
      .filter((childDirectory) =>
        markdownFiles.some((filePath) =>
          filePath.startsWith(`${childDirectory}${path.sep}`),
        ),
      );
    const childIndexes = childDocumentationDirectories.map((childDirectory) =>
      path.join(childDirectory, "README.md"),
    );
    const requiredTargets = [...directDocuments, ...childIndexes];
    const indexPath = path.join(directory, "README.md");
    const indexDocument = documentsByPath.get(indexPath);

    if (requiredTargets.length > 0 && !indexDocument) {
      errors.push(
        `${relative(directory)}: documentation directory requires README.md`,
      );
      continue;
    }

    if (!indexDocument) {
      continue;
    }

    if (requiredTargets.length > 0 && indexDocument.metadata?.type !== "index") {
      errors.push(
        `${relative(indexPath)}: collection README.md must have type index`,
      );
    }

    const linked = linkedLocalMarkdownPaths(indexDocument);
    for (const targetPath of requiredTargets) {
      if (!documentsByPath.has(targetPath)) {
        errors.push(
          `${relative(targetPath)}: child documentation directory requires README.md`,
        );
        continue;
      }
      if (!linked.has(path.normalize(targetPath))) {
        errors.push(
          `${relative(targetPath)}: not directly listed in ${relative(indexPath)}`,
        );
      }
    }
  }
}

function validateIndexTables(documentsByPath) {
  for (const document of documentsByPath.values()) {
    if (document.metadata?.type !== "index") {
      continue;
    }

    visit(document.tree, "table", (table) => {
      const [headerRow, ...rows] = table.children;
      const headers = (headerRow?.children ?? []).map((cell) =>
        toString(cell).trim().toLowerCase(),
      );
      const idColumn = headers.indexOf("id");
      const ownerColumn = headers.indexOf("owner");
      const blockerColumn = headers.indexOf("primary gate");
      const statusColumn = Math.max(
        headers.indexOf("status"),
        headers.indexOf("readiness"),
      );

      for (const row of rows) {
        const cells = row.children ?? [];
        const targets = cells.flatMap((cell) => markdownLinks(cell));

        for (const rawTarget of targets) {
          const resolved = resolveMarkdownTarget(document.filePath, rawTarget);
          if (!resolved || resolved.escapedRepository) {
            continue;
          }

          const target = documentsByPath.get(path.normalize(resolved.targetPath));
          if (!target?.metadata) {
            continue;
          }

          if (
            idColumn >= 0 &&
            toString(cells[idColumn]).trim() !== target.metadata.id
          ) {
            errors.push(
              `${relative(document.filePath)}: table id for ${relative(target.filePath)} must be ${target.metadata.id}`,
            );
          }

          if (
            ownerColumn >= 0 &&
            toString(cells[ownerColumn]).trim() !== target.metadata.owner
          ) {
            errors.push(
              `${relative(document.filePath)}: table owner for ${target.metadata.id} must be ${target.metadata.owner}`,
            );
          }

          if (blockerColumn >= 0) {
            const renderedBlockers = toString(cells[blockerColumn])
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
              .sort();
            const expectedBlockers = [
              ...(target.metadata.blocked_by ?? []),
            ].sort();
            if (
              JSON.stringify(renderedBlockers) !==
              JSON.stringify(expectedBlockers)
            ) {
              errors.push(
                `${relative(document.filePath)}: primary gate for ${target.metadata.id} must match blocked_by metadata`,
              );
            }
          }

          if (statusColumn >= 0) {
            const renderedStatus = toString(cells[statusColumn])
              .trim()
              .toLowerCase();
            const expectedStatus =
              target.metadata.type === "open-decision" &&
              target.metadata.status === "resolved"
                ? `resolved by ${target.metadata.resolved_by}`.toLowerCase()
                : target.metadata.status;
            if (renderedStatus !== expectedStatus) {
              errors.push(
                `${relative(document.filePath)}: table status for ${target.metadata.id} must be ${expectedStatus}`,
              );
            }
          }
        }
      }
    });
  }
}

function validateAdrLifecycleIndex(documentsByPath) {
  const indexPath = path.join(docsRoot, "decisions/README.md");
  const indexDocument = documentsByPath.get(indexPath);
  if (!indexDocument) {
    errors.push(`${relative(indexPath)}: ADR index is missing`);
    return;
  }

  const linksBySection = new Map();
  let section = "";
  for (const node of indexDocument.tree.children) {
    if (node.type === "heading" && node.depth === 2) {
      section = toString(node).trim().toLowerCase();
      continue;
    }

    for (const rawTarget of markdownLinks(node)) {
      const resolved = resolveMarkdownTarget(indexPath, rawTarget);
      if (!resolved || resolved.escapedRepository) {
        continue;
      }
      const target = documentsByPath.get(path.normalize(resolved.targetPath));
      if (target?.metadata?.type !== "adr") {
        continue;
      }

      const sections = linksBySection.get(target.metadata.id) ?? new Set();
      sections.add(section);
      linksBySection.set(target.metadata.id, sections);
    }
  }

  const expectedSectionByStatus = {
    accepted: "accepted decisions",
    proposed: "proposed decisions",
    superseded: "superseded decisions",
  };

  for (const document of documentsByPath.values()) {
    if (document.metadata?.type !== "adr") {
      continue;
    }

    const expectedSection = expectedSectionByStatus[document.metadata.status];
    const sections = linksBySection.get(document.metadata.id) ?? new Set();
    if (!sections.has(expectedSection)) {
      errors.push(
        `${relative(document.filePath)}: ${document.metadata.status} ADR must be listed under "${expectedSection}" in ${relative(indexPath)}`,
      );
    }

    for (const lifecycleSection of [
      "accepted decisions",
      "proposed decisions",
      "superseded decisions",
    ]) {
      if (lifecycleSection !== expectedSection && sections.has(lifecycleSection)) {
        errors.push(
          `${relative(document.filePath)}: ADR is also listed under incorrect lifecycle section "${lifecycleSection}"`,
        );
      }
    }
  }
}

function validateMermaid(diagrams) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [mermaidValidatorPath], {
      cwd: repositoryRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, 120_000);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        error: error.message,
        results: null,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut || code !== 0) {
        resolve({
          error: timedOut
            ? "parser timed out after 120 seconds"
            : stderr.trim() || `parser exited with code ${code}`,
          results: null,
        });
        return;
      }

      try {
        resolve({
          error: null,
          results: JSON.parse(stdout),
        });
      } catch (error) {
        resolve({
          error: `parser returned invalid JSON: ${error.message}`,
          results: null,
        });
      }
    });

    child.stdin.end(JSON.stringify(diagrams));
  });
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

  for (const document of documents) {
    for (const field of [
      "blocked_by",
      "related",
      "supersedes",
      "superseded_by",
    ]) {
      for (const targetId of document.metadata?.[field] ?? []) {
        if (targetId === document.metadata.id) {
          errors.push(
            `${relative(document.filePath)}: ${field} must not reference the document itself`,
          );
        }
        if (!documentsById.has(targetId)) {
          errors.push(
            `${relative(document.filePath)}: ${field} references unknown id ${targetId}`,
          );
        }
      }
    }

    if (
      document.metadata?.status === "superseded" &&
      (document.metadata.superseded_by?.length ?? 0) === 0
    ) {
      errors.push(
        `${relative(document.filePath)}: superseded document must declare superseded_by`,
      );
    }

    for (const blockerId of document.metadata?.blocked_by ?? []) {
      const blocker = documentsById.get(blockerId);
      if (
        blocker?.metadata?.type !== "open-decision" ||
        !["open", "deferred"].includes(blocker.metadata.status)
      ) {
        errors.push(
          `${relative(document.filePath)}: blocked_by must reference an open or deferred decision`,
        );
      }
      if (!(document.metadata.related ?? []).includes(blockerId)) {
        errors.push(
          `${relative(document.filePath)}: blocked_by ${blockerId} must also appear in related`,
        );
      }
    }

    if (
      ["accepted", "active"].includes(document.metadata?.status) &&
      (document.metadata.blocked_by?.length ?? 0) > 0
    ) {
      errors.push(
        `${relative(document.filePath)}: accepted or active document cannot retain blocked_by`,
      );
    }

    if (document.metadata?.resolved_by) {
      if (document.metadata.type !== "open-decision") {
        errors.push(
          `${relative(document.filePath)}: resolved_by is allowed only on open decisions`,
        );
      } else {
        const decidingAdr = documentsById.get(document.metadata.resolved_by);
        if (
          decidingAdr?.metadata?.type !== "adr" ||
          !["accepted", "superseded"].includes(decidingAdr.metadata.status)
        ) {
          errors.push(
            `${relative(document.filePath)}: resolved_by must reference an accepted or superseded ADR`,
          );
        }
        if (
          !(document.metadata.related ?? []).includes(
            document.metadata.resolved_by,
          )
        ) {
          errors.push(
            `${relative(document.filePath)}: resolved_by ADR must also appear in related`,
          );
        }
      }
    }

    if (
      document.metadata?.type === "open-decision" &&
      document.metadata.status === "resolved" &&
      !document.metadata.resolved_by
    ) {
      errors.push(
        `${relative(document.filePath)}: resolved open decision requires resolved_by`,
      );
    }

    if (
      document.metadata?.type === "open-decision" &&
      document.metadata.status !== "resolved" &&
      document.metadata.resolved_by
    ) {
      errors.push(
        `${relative(document.filePath)}: unresolved open decision must not declare resolved_by`,
      );
    }
  }

  for (const document of documents) {
    for (const targetId of document.metadata?.supersedes ?? []) {
      const target = documentsById.get(targetId);
      if (
        target &&
        !(target.metadata?.superseded_by ?? []).includes(document.metadata.id)
      ) {
        errors.push(
          `${relative(document.filePath)}: supersedes ${targetId}, but the target does not declare superseded_by ${document.metadata.id}`,
        );
      }
    }

    for (const targetId of document.metadata?.superseded_by ?? []) {
      const target = documentsById.get(targetId);
      if (
        target &&
        !(target.metadata?.supersedes ?? []).includes(document.metadata.id)
      ) {
        errors.push(
          `${relative(document.filePath)}: superseded_by ${targetId}, but the target does not declare supersedes ${document.metadata.id}`,
        );
      }
    }
  }

  const localGraph = new Map();
  for (const filePath of allMarkdownFiles) {
    const tree = markdownTrees.get(filePath);
    const targets = new Set();

    for (const rawTarget of markdownLinks(tree)) {
      const resolved = resolveMarkdownTarget(filePath, rawTarget);
      if (!resolved) {
        continue;
      }

      if (resolved.escapedRepository) {
        errors.push(
          `${relative(filePath)}: local link escapes repository root: ${rawTarget}`,
        );
        continue;
      }

      const targetPath = await normalizeExistingTarget(resolved.targetPath);
      try {
        const targetStat = await stat(targetPath);
        if (!targetStat.isFile()) {
          throw new Error("not a file");
        }
      } catch {
        errors.push(
          `${relative(filePath)}: broken local link ${rawTarget}`,
        );
        continue;
      }

      if (path.extname(targetPath) === ".md") {
        targets.add(targetPath);
      }

      if (resolved.anchor && path.extname(targetPath) === ".md") {
        const targetTree =
          markdownTrees.get(targetPath) ??
          parseMarkdown(await readFile(targetPath, "utf8"));
        if (!headingAnchors(targetTree).has(resolved.anchor)) {
          errors.push(
            `${relative(filePath)}: missing anchor #${resolved.anchor} in ${relative(targetPath)}`,
          );
        }
      }
    }

    localGraph.set(filePath, targets);
  }

  const reachable = new Set([entrypoint]);
  const queue = [entrypoint];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const target of localGraph.get(current) ?? []) {
      if (
        documentsByPath.has(target) &&
        !reachable.has(target)
      ) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }

  for (const document of documents) {
    if (!reachable.has(document.filePath)) {
      errors.push(
        `${relative(document.filePath)}: unreachable from docs/README.md`,
      );
    }
  }

  await validateDirectoryIndexes(docsMarkdownFiles, documentsByPath);
  validateIndexTables(documentsByPath);
  validateAdrLifecycleIndex(documentsByPath);

  const diagrams = documents.flatMap((document) =>
    mermaidDiagrams(document.tree, document.filePath),
  );

  if (diagrams.length > 0 && process.env.DOCS_SKIP_MERMAID !== "1") {
    const mermaidResult = await validateMermaid(diagrams);
    if (!mermaidResult.results) {
      errors.push(`Mermaid validation failed: ${mermaidResult.error}`);
    } else {
      for (const result of mermaidResult.results) {
        if (!result.valid) {
          errors.push(
            `${result.key.replace(/:(\d+)$/, ": Mermaid diagram $1")} is invalid: ${result.error}`,
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors.sort()) {
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
