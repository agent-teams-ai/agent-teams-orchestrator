import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import {
  listRepositoryFiles,
  matchingCodeAnchorFiles,
  validateCodeAnchorPattern,
} from "./code-anchors.mjs";
import {
  documentIdPattern,
  normalizeRepositoryPath,
  parseArguments,
  resolveOutput,
  slugify,
  unique,
  usage,
  validateRequiredOptions,
} from "./create-doc-options.mjs";
import { discoverGovernedMarkdown } from "./document-files.mjs";
import { parseFrontmatter, parseMarkdown } from "./document-parser.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");

function parseCodeAnchors(values) {
  const patterns = new Set();
  return unique(values, "--code-anchor").map((value) => {
    const separator = value.indexOf(":");
    if (separator < 0) {
      throw new Error(
        `invalid --code-anchor ${value}; expected advisory:path or required:path`,
      );
    }
    const enforcement = value.slice(0, separator);
    const pattern = value.slice(separator + 1);
    if (!["advisory", "required"].includes(enforcement)) {
      throw new Error(
        `invalid --code-anchor enforcement ${enforcement}; expected advisory or required`,
      );
    }
    const patternError = validateCodeAnchorPattern(pattern);
    if (patternError) {
      throw new Error(`invalid --code-anchor ${value}: ${patternError}`);
    }
    if (patterns.has(pattern)) {
      throw new Error(`--code-anchor pattern ${pattern} may be provided only once`);
    }
    patterns.add(pattern);
    return { enforcement, pattern };
  });
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function loadRepositoryDocuments(repositoryRoot) {
  const { governedMarkdownFiles } =
    await discoverGovernedMarkdown(repositoryRoot);
  const documents = new Map();
  for (const filePath of governedMarkdownFiles) {
    const source = await readFile(filePath, "utf8");
    const { metadata } = parseFrontmatter(parseMarkdown(source));
    if (metadata?.id) {
      documents.set(metadata.id, { filePath, metadata });
    }
  }
  return documents;
}

async function validateOwner(repositoryRoot, owner) {
  const ownerCatalog = YAML.parse(
    await readFile(path.join(repositoryRoot, "docs/owners.yaml"), "utf8"),
  );
  if (!Object.hasOwn(ownerCatalog?.owners ?? {}, owner)) {
    throw new Error(`owner ${owner} is not registered in docs/owners.yaml`);
  }
}

function validateRelations(options, documents, status) {
  const explicitRelated = unique(options.related, "--related");
  const blockedBy = unique(options.blockedBy, "--blocked-by");
  const related = [...new Set([...explicitRelated, ...blockedBy])];
  for (const targetId of related) {
    if (!documentIdPattern.test(targetId)) {
      throw new Error(`invalid related document ID ${targetId}`);
    }
    if (targetId === options.id) {
      throw new Error(`document ${options.id} must not reference itself`);
    }
    if (!documents.has(targetId)) {
      throw new Error(`related document ${targetId} does not exist`);
    }
  }
  for (const blockerId of blockedBy) {
    const blocker = documents.get(blockerId)?.metadata;
    if (
      blocker?.type !== "open-decision" ||
      !["open", "deferred"].includes(blocker.status)
    ) {
      throw new Error(
        `--blocked-by ${blockerId} must reference an open or deferred decision`,
      );
    }
  }
  if (["accepted", "active"].includes(status) && blockedBy.length > 0) {
    throw new Error(`type ${options.type} starts as ${status} and cannot be blocked`);
  }
  return { blockedBy, related };
}

async function validateCodeAnchors(repositoryRoot, anchors) {
  if (anchors.length === 0) {
    return;
  }
  const repositoryFiles = await listRepositoryFiles(repositoryRoot);
  for (const anchor of anchors) {
    if (matchingCodeAnchorFiles(anchor.pattern, repositoryFiles).length === 0) {
      throw new Error(
        `--code-anchor pattern ${anchor.pattern} matches no repository files`,
      );
    }
  }
}

async function extractTemplate(repositoryRoot, templateName) {
  const source = await readFile(
    path.join(repositoryRoot, "docs/templates", templateName),
    "utf8",
  );
  const matches = [...source.matchAll(/```markdown\r?\n([\s\S]*?)\r?\n```/g)];
  if (matches.length !== 1) {
    throw new Error(
      `docs/templates/${templateName} must contain exactly one markdown skeleton`,
    );
  }
  const skeleton = matches[0][1].replaceAll("\r\n", "\n");
  const body = skeleton.replace(/^---\n[\s\S]*?\n---\n+/, "");
  if (!/^# .+$/m.test(body)) {
    throw new Error(`docs/templates/${templateName} skeleton is missing a title`);
  }
  return body;
}

function renderDocument(definition, options, relations, codeAnchors, body) {
  const metadata = {
    id: options.id,
    type: options.type,
    status: definition.status,
    owner: options.owner,
    summary: options.summary,
  };
  if (relations.related.length > 0) {
    metadata.related = relations.related;
  }
  if (relations.blockedBy.length > 0) {
    metadata.blocked_by = relations.blockedBy;
  }
  if (codeAnchors.length > 0) {
    metadata.code_anchors = codeAnchors.map(({ pattern, enforcement }) => ({
      pattern,
      enforcement,
    }));
  }
  const title = definition.title(options);
  const renderedBody = body.replace(/^# .+$/m, `# ${title}`).trimEnd();
  return `---\n${YAML.stringify(metadata, { lineWidth: 0 }).trimEnd()}\n---\n\n${renderedBody}\n`;
}

async function nearestExistingAncestor(filePath) {
  let candidate = filePath;
  while (!(await pathExists(candidate))) {
    const parent = path.dirname(candidate);
    if (parent === candidate) {
      throw new Error(`cannot resolve an existing ancestor for ${filePath}`);
    }
    candidate = parent;
  }
  return candidate;
}

async function assertRealPathInsideRepository(
  repositoryRoot,
  candidate,
  description,
) {
  const repositoryRealPath = await realpath(repositoryRoot);
  const candidateRealPath = await realpath(candidate);
  const relative = path.relative(repositoryRealPath, candidateRealPath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`)) {
    throw new Error(`${description} resolves outside the repository through a symlink`);
  }
}

async function assertSafeDestination(repositoryRoot, destination) {
  const existingAncestor = await nearestExistingAncestor(path.dirname(destination));
  await assertRealPathInsideRepository(
    repositoryRoot,
    existingAncestor,
    "destination",
  );
  try {
    await lstat(destination);
    throw new Error(
      `${normalizeRepositoryPath(path.relative(repositoryRoot, destination))} already exists; docs:new never overwrites files`,
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function withWriteLock(repositoryRoot, operation) {
  const lockDirectory = path.join(repositoryRoot, ".agent-teams-local");
  const lockPath = path.join(lockDirectory, "docs-new.lock");
  await mkdir(lockDirectory, { recursive: true });
  await assertRealPathInsideRepository(
    repositoryRoot,
    lockDirectory,
    "documentation write lock",
  );
  let lock;
  try {
    lock = await open(lockPath, "wx");
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error(
        "another docs:new write is active or left a stale .agent-teams-local/docs-new.lock",
        { cause: error },
      );
    }
    throw error;
  }

  try {
    await lock.writeFile(`${String(process.pid)}\n`);
    return await operation();
  } finally {
    try {
      await lock.close();
    } finally {
      await unlink(lockPath);
    }
  }
}

function printNextSteps(repositoryPath, definition) {
  const indexPath =
    definition.indexPath ??
    `${repositoryPath.split("/src/features/", 1)[0]}/README.md`;
  console.log(`Next steps:
  1. Complete every applicable template section without inventing facts.
  2. Create or update ${indexPath}, link ${repositoryPath}, and update stable-ID relationships.
  3. Run pnpm docs:impact while iterating.
  4. Run pnpm docs:check before completion.`);
}

async function createDocumentUnlocked(options) {
  const definition = validateRequiredOptions(options);
  await validateOwner(options.repositoryRoot, options.owner);
  const slug = options.slug ?? slugify(options.title);
  const repositoryPath = resolveOutput(options, definition, slug);
  const destination = path.join(options.repositoryRoot, repositoryPath);
  const documents = await loadRepositoryDocuments(options.repositoryRoot);
  const duplicate = documents.get(options.id);
  if (duplicate) {
    throw new Error(
      `document ID ${options.id} already exists at ${normalizeRepositoryPath(path.relative(options.repositoryRoot, duplicate.filePath))}`,
    );
  }
  const relations = validateRelations(options, documents, definition.status);
  const codeAnchors = parseCodeAnchors(options.codeAnchors);
  await validateCodeAnchors(options.repositoryRoot, codeAnchors);
  const body = await extractTemplate(options.repositoryRoot, definition.template);
  const rendered = renderDocument(
    definition,
    { ...options, slug },
    relations,
    codeAnchors,
    body,
  );

  await assertSafeDestination(options.repositoryRoot, destination);
  if (options.dryRun) {
    console.log(`Would create ${repositoryPath}:\n\n${rendered}`);
  } else {
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, rendered, { flag: "wx" });
    console.log(`Created ${repositoryPath} from docs/templates/${definition.template}.`);
  }
  printNextSteps(repositoryPath, definition);
}

async function createDocument(options) {
  if (options.dryRun) {
    return createDocumentUnlocked(options);
  }
  return withWriteLock(options.repositoryRoot, () =>
    createDocumentUnlocked(options),
  );
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2), defaultRepositoryRoot);
    if (options.help) {
      usage();
      return;
    }
    await createDocument(options);
  } catch (error) {
    console.error(`Documentation creation failed: ${error.message}`);
    usage();
    process.exitCode = 1;
  }
}

await main();
