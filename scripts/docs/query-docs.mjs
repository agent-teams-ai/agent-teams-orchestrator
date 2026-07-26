import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import YAML from "yaml";

import { discoverGovernedMarkdown } from "./document-files.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(remarkGfm);
const filterNames = new Set([
  "blocked-by",
  "id",
  "owner",
  "related",
  "status",
  "type",
]);

function usage() {
  console.log(`Usage: pnpm docs:query -- [filters] [--json]

Filters are combined with AND:
  --id <document-id>
  --owner <owner>
  --type <document-type>
  --status <status>
  --related <document-id>
  --blocked-by <open-decision-id>

Examples:
  pnpm docs:query -- --id ADR-0051
  pnpm docs:query -- --owner platform/persistence --status accepted
  pnpm docs:query -- --related OD-004 --json`);
}

function parseArguments(arguments_) {
  const filters = {};
  let json = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--help" || argument === "-h") {
      return { help: true };
    }
    if (argument === "--") {
      continue;
    }
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (!argument.startsWith("--")) {
      throw new Error(`unexpected argument ${argument}`);
    }

    const name = argument.slice(2);
    if (!filterNames.has(name)) {
      throw new Error(`unknown filter --${name}`);
    }
    const value = arguments_[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`--${name} requires a value`);
    }
    filters[name] = value;
    index += 1;
  }

  return { filters, help: false, json };
}

function parseMetadata(source) {
  const tree = processor.parse(source.replaceAll("\r\n", "\n"));
  const frontmatter = tree.children[0];
  if (frontmatter?.type !== "yaml") {
    return null;
  }
  return YAML.parse(frontmatter.value);
}

function matches(document, filters) {
  return Object.entries(filters).every(([name, value]) => {
    if (name === "blocked-by") {
      return (document.metadata.blocked_by ?? []).includes(value);
    }
    if (name === "related") {
      return [
        ...(document.metadata.related ?? []),
        ...(document.metadata.supersedes ?? []),
        ...(document.metadata.superseded_by ?? []),
      ].includes(value);
    }
    return document.metadata[name] === value;
  });
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    usage();
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    usage();
    return;
  }

  const { governedMarkdownFiles } =
    await discoverGovernedMarkdown(repositoryRoot);
  const documents = [];
  for (const filePath of governedMarkdownFiles) {
    const metadata = parseMetadata(await readFile(filePath, "utf8"));
    if (metadata) {
      documents.push({
        id: metadata.id,
        metadata,
        owner: metadata.owner,
        path: path.relative(repositoryRoot, filePath).split(path.sep).join("/"),
        status: metadata.status,
        summary: metadata.summary,
        type: metadata.type,
      });
    }
  }

  const matches_ = documents
    .filter((document) => matches(document, options.filters))
    .sort((left, right) => left.id.localeCompare(right.id));

  if (options.json) {
    console.log(JSON.stringify(matches_, null, 2));
  } else {
    for (const document of matches_) {
      console.log(
        [
          document.id,
          document.type,
          document.status,
          document.owner,
          document.path,
          document.summary,
        ].join("\t"),
      );
    }
  }

  if (matches_.length === 0) {
    process.exitCode = 1;
  }
}

await main();
