import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import YAML from "yaml";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const docsRoot = path.join(repositoryRoot, "docs");
const metadataSchemaPath = path.join(docsRoot, "metadata.schema.json");
const entrypoint = path.join(docsRoot, "README.md");
const mermaidValidatorPath = path.join(scriptDirectory, "validate-mermaid.mjs");
const adrApprovalPolicyStart = 34;

const errors = [];
const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(remarkGfm);

function relative(filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join("/");
}

async function walk(directory, predicate) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(entryPath, predicate)));
    } else if (predicate(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

function parseMarkdown(source) {
  return markdownProcessor.parse(source.replaceAll("\r\n", "\n"));
}

function parseDocument(filePath, tree) {
  const frontmatter = tree.children[0];
  if (
    frontmatter?.type !== "yaml" ||
    frontmatter.position?.start.line !== 1
  ) {
    errors.push(`${relative(filePath)}: missing YAML frontmatter`);
    return {
      metadata: null,
      tree,
    };
  }

  try {
    const metadata = YAML.parse(frontmatter.value);
    return {
      metadata,
      tree,
    };
  } catch (error) {
    errors.push(`${relative(filePath)}: invalid YAML: ${error.message}`);
    return {
      metadata: null,
      tree,
    };
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

function validateIndexCompleteness(documentsByPath) {
  const collections = [
    {
      directory: path.join(docsRoot, "decisions"),
      index: path.join(docsRoot, "decisions/README.md"),
      type: "adr",
    },
    {
      directory: path.join(docsRoot, "open-decisions"),
      index: path.join(docsRoot, "open-decisions/README.md"),
      type: "open-decision",
    },
    {
      directory: path.join(docsRoot, "domain/contexts"),
      index: path.join(docsRoot, "domain/contexts/README.md"),
      type: "bounded-context",
    },
  ];

  for (const collection of collections) {
    const indexDocument = documentsByPath.get(collection.index);
    if (!indexDocument) {
      errors.push(`${relative(collection.index)}: collection index is missing`);
      continue;
    }

    const linked = new Set(
      markdownLinks(indexDocument.tree)
        .map((target) => resolveMarkdownTarget(collection.index, target))
        .filter(Boolean)
        .map(({ targetPath }) => path.normalize(targetPath)),
    );

    for (const document of documentsByPath.values()) {
      if (
        document.metadata?.type === collection.type &&
        document.filePath.startsWith(`${collection.directory}${path.sep}`) &&
        !linked.has(path.normalize(document.filePath))
      ) {
        errors.push(
          `${relative(document.filePath)}: not listed in ${relative(collection.index)}`,
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
  const markdownFiles = await walk(
    docsRoot,
    (filePath) => path.extname(filePath) === ".md",
  );
  const allMarkdownFiles = [
    path.join(repositoryRoot, "README.md"),
    path.join(repositoryRoot, "AGENTS.md"),
    ...markdownFiles,
  ];

  const schema = JSON.parse(await readFile(metadataSchemaPath, "utf8"));
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

  for (const filePath of allMarkdownFiles) {
    const source = await readFile(filePath, "utf8");
    markdownTrees.set(filePath, parseMarkdown(source));
  }

  for (const filePath of markdownFiles) {
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

    validateFilename(document);
    validateAdrApproval(document);
  }

  for (const document of documents) {
    for (const field of ["related", "supersedes", "superseded_by"]) {
      for (const targetId of document.metadata?.[field] ?? []) {
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
        target.startsWith(`${docsRoot}${path.sep}`) &&
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

  validateIndexCompleteness(documentsByPath);

  const diagrams = documents.flatMap((document) =>
    mermaidDiagrams(document.tree, document.filePath),
  );

  if (diagrams.length > 0) {
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
