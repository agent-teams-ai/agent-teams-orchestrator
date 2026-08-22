import { lstat, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { visit } from "unist-util-visit";
import YAML from "yaml";

import {
  parseFrontmatter,
  parseMarkdown,
} from "../docs/document-parser.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");
const allowedRootEntries = new Set([
  "SKILL.md",
  "agents",
  "assets",
  "references",
  "scripts",
]);
const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const docsAuthoringRequiredRoutes = [
  { label: "pnpm docs:info", pattern: /pnpm docs:info/u },
  { label: "pnpm docs:find", pattern: /pnpm docs:find/u },
  { label: "pnpm docs:new preview", pattern: /pnpm docs:new -- [^\n]*--dry-run/u },
  { label: "pnpm docs:new apply", pattern: /pnpm docs:new -- [^\n]*--apply/u },
  { label: "reported index/link", pattern: /reported index\/link/u },
  { label: "pnpm docs:check", pattern: /pnpm docs:check/u },
  { label: "pnpm docs:doctor", pattern: /pnpm docs:doctor/u },
  { label: "pnpm docs:recover", pattern: /pnpm docs:recover/u },
];

function relative(repositoryRoot, filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join("/");
}

function parseArguments(argv) {
  let repositoryRoot = process.env.SKILLS_REPOSITORY_ROOT
    ? path.resolve(process.env.SKILLS_REPOSITORY_ROOT)
    : defaultRepositoryRoot;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--root") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--root requires a path");
      }
      repositoryRoot = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`unexpected argument ${argument}`);
  }
  return repositoryRoot;
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function rejectSymlinks(repositoryRoot, directory, errors) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    const entryStat = await lstat(entryPath);
    if (entryStat.isSymbolicLink()) {
      errors.push(`${relative(repositoryRoot, entryPath)}: symlinks are prohibited`);
    } else if (entryStat.isDirectory()) {
      await rejectSymlinks(repositoryRoot, entryPath, errors);
    }
  }
}

function localMarkdownTargets(tree) {
  const targets = [];
  visit(tree, (node) => {
    if (
      (node.type === "link" || node.type === "image") &&
      typeof node.url === "string" &&
      !node.url.startsWith("#") &&
      !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(node.url)
    ) {
      targets.push(node.url.split("#", 1)[0]);
    }
  });
  return targets.filter(Boolean);
}

async function validateOpenAiMetadata(
  repositoryRoot,
  skillDirectory,
  errors,
) {
  const metadataPath = path.join(skillDirectory, "agents/openai.yaml");
  if (!(await exists(metadataPath))) {
    errors.push(
      `${relative(repositoryRoot, skillDirectory)}: missing agents/openai.yaml`,
    );
    return;
  }

  let metadata;
  try {
    metadata = YAML.parse(await readFile(metadataPath, "utf8"));
  } catch (error) {
    errors.push(
      `${relative(repositoryRoot, metadataPath)}: invalid YAML: ${error.message}`,
    );
    return;
  }
  const interfaceMetadata = metadata?.interface;
  for (const field of ["display_name", "short_description", "default_prompt"]) {
    if (
      typeof interfaceMetadata?.[field] !== "string" ||
      !interfaceMetadata[field].trim()
    ) {
      errors.push(
        `${relative(repositoryRoot, metadataPath)}: interface.${field} must be a non-empty string`,
      );
    }
  }
}

function validateDocsAuthoringRoutes(
  repositoryRoot,
  skillDirectory,
  source,
  errors,
) {
  if (path.basename(skillDirectory) !== "docs-authoring") {
    return;
  }
  const skillPath = path.join(skillDirectory, "SKILL.md");
  for (const route of docsAuthoringRequiredRoutes) {
    if (!route.pattern.test(source)) {
      errors.push(
        `${relative(repositoryRoot, skillPath)}: canonical documentation workflow must route ${route.label}`,
      );
    }
  }
}

async function validateSkill(repositoryRoot, skillDirectory, errors) {
  const folderName = path.basename(skillDirectory);
  const skillPath = path.join(skillDirectory, "SKILL.md");
  const entries = await readdir(skillDirectory, { withFileTypes: true });

  for (const entry of entries) {
    if (!allowedRootEntries.has(entry.name)) {
      errors.push(
        `${relative(repositoryRoot, path.join(skillDirectory, entry.name))}: unsupported skill-root entry`,
      );
    }
  }
  await rejectSymlinks(repositoryRoot, skillDirectory, errors);

  if (!(await exists(skillPath))) {
    errors.push(`${relative(repositoryRoot, skillDirectory)}: missing SKILL.md`);
    return;
  }

  const source = await readFile(skillPath, "utf8");
  const tree = parseMarkdown(source);
  const { error, metadata } = parseFrontmatter(tree);
  if (error) {
    errors.push(`${relative(repositoryRoot, skillPath)}: ${error}`);
    return;
  }

  if (
    typeof metadata.name !== "string" ||
    metadata.name.length > 64 ||
    !skillNamePattern.test(metadata.name)
  ) {
    errors.push(
      `${relative(repositoryRoot, skillPath)}: name must be kebab-case and at most 64 characters`,
    );
  } else if (metadata.name !== folderName) {
    errors.push(
      `${relative(repositoryRoot, skillPath)}: name ${metadata.name} must match folder ${folderName}`,
    );
  }

  if (
    typeof metadata.description !== "string" ||
    metadata.description.length < 20 ||
    metadata.description.length > 1024
  ) {
    errors.push(
      `${relative(repositoryRoot, skillPath)}: description must contain 20 to 1024 characters`,
    );
  }

  if (source.split("\n").length > 500) {
    errors.push(`${relative(repositoryRoot, skillPath)}: skill exceeds 500 lines`);
  }
  validateDocsAuthoringRoutes(repositoryRoot, skillDirectory, source, errors);
  if (!tree.children.some((node) => node.type === "heading" && node.depth === 1)) {
    errors.push(`${relative(repositoryRoot, skillPath)}: missing level-one title`);
  }

  for (const rawTarget of localMarkdownTargets(tree)) {
    const targetPath = path.resolve(skillDirectory, decodeURIComponent(rawTarget));
    const relativeToSkill = path.relative(skillDirectory, targetPath);
    if (
      relativeToSkill === ".." ||
      relativeToSkill.startsWith(`..${path.sep}`)
    ) {
      errors.push(
        `${relative(repositoryRoot, skillPath)}: local link escapes skill root: ${rawTarget}`,
      );
    } else if (!(await exists(targetPath))) {
      errors.push(
        `${relative(repositoryRoot, skillPath)}: broken local link ${rawTarget}`,
      );
    }
  }

  await validateOpenAiMetadata(repositoryRoot, skillDirectory, errors);
}

async function main() {
  let repositoryRoot;
  try {
    repositoryRoot = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  const skillsRoot = path.join(repositoryRoot, ".agents/skills");
  const errors = [];
  if (!(await exists(skillsRoot))) {
    errors.push(".agents/skills: repository-local skill directory is missing");
  } else {
    const entries = await readdir(skillsRoot, { withFileTypes: true });
    const skillDirectories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(skillsRoot, entry.name))
      .toSorted();
    for (const fileEntry of entries.filter((entry) => !entry.isDirectory())) {
      errors.push(
        `${relative(repositoryRoot, path.join(skillsRoot, fileEntry.name))}: skill root may contain only skill directories`,
      );
    }
    if (skillDirectories.length === 0) {
      errors.push(".agents/skills: at least one repository-local skill is required");
    }
    for (const skillDirectory of skillDirectories) {
      await validateSkill(repositoryRoot, skillDirectory, errors);
    }

    if (errors.length === 0) {
      console.log(
        `Skill validation passed: ${skillDirectories.length} repository-local skill(s).`,
      );
    }
  }

  if (errors.length > 0) {
    for (const error of errors.toSorted()) {
      console.error(`ERROR ${error}`);
    }
    console.error(`\nSkill validation failed with ${errors.length} error(s).`);
    process.exitCode = 1;
  }
}

await main();
