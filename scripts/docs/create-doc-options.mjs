import path from "node:path";

export const documentIdPattern =
  /^(?:ADR-[0-9]{4}|OD-[0-9]{3}|[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+)$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const documentTypes = {
  adr: {
    defaultPath: ({ id, slug }) =>
      `docs/decisions/${id.slice("ADR-".length)}-${slug}.md`,
    idPattern: /^ADR-[0-9]{4}$/,
    indexPath: "docs/decisions/README.md",
    status: "proposed",
    template: "adr.md",
    title: ({ id, title }) => `${id}: ${title}`,
  },
  "bounded-context": {
    defaultPath: ({ id }) =>
      `docs/domain/contexts/${id.slice("domain.contexts.".length)}/README.md`,
    idPattern: /^domain\.contexts\.[a-z][a-z0-9-]*$/,
    indexPath: "docs/domain/contexts/README.md",
    status: "proposed",
    template: "bounded-context.md",
    title: ({ title }) => title,
  },
  contract: {
    defaultPath: ({ slug }) => `docs/contracts/${slug}.md`,
    idPattern: /^contract(?:\.[a-z][a-z0-9-]*){2,}$/,
    indexPath: "docs/contracts/README.md",
    status: "proposed",
    template: "contract.md",
    title: ({ title }) => title,
  },
  feature: {
    idPattern: /^feature(?:\.[a-z][a-z0-9-]*){2,}$/,
    outputRequired: true,
    status: "proposed",
    template: "feature.md",
    title: ({ title }) => title,
    validatePath: (repositoryPath) =>
      /^(?:apps|packages|tooling)\/.+\/src\/features\/.+\/README\.md$/.test(
        repositoryPath,
      )
        ? null
        : "feature output must be apps|packages|tooling/**/src/features/**/README.md",
  },
  "open-decision": {
    defaultPath: ({ id, slug }) => `docs/open-decisions/${id}-${slug}.md`,
    idPattern: /^OD-[0-9]{3}$/,
    indexPath: "docs/open-decisions/README.md",
    status: "open",
    template: "open-decision.md",
    title: ({ id, title }) => `${id}: ${title}`,
  },
  runbook: {
    defaultPath: ({ slug }) => `docs/operations/${slug}.md`,
    idPattern: /^runbook(?:\.[a-z][a-z0-9-]*){2,}$/,
    indexPath: "docs/operations/README.md",
    status: "active",
    template: "runbook.md",
    title: ({ title }) => title,
  },
};

export function usage() {
  console.log(`Usage: pnpm docs:new -- [options]

Required:
  --type <type>            adr, open-decision, bounded-context, feature,
                           contract, or runbook
  --id <document-id>       Stable document ID
  --title <title>          Human-readable title
  --owner <owner>          Registered owner from docs/owners.yaml
  --summary <sentence>     One-sentence authority summary, 20 to 180 characters

Optional:
  --slug <slug>            Override the filename slug derived from the title
  --output <path>          Required only for colocated feature documentation
  --related <id>           Add a related document; repeat as needed
  --blocked-by <OD-NNN>    Add an open-decision blocker and related link
  --code-anchor <mode:path> Add advisory or required code impact; repeat as needed
  --dry-run                Validate and print without writing
  --root <path>            Override repository root for fixtures or tooling
  --help                   Show this help

Examples:
  pnpm docs:new -- --type adr --id ADR-0083 --title "Deterministic doc creation" \\
    --owner architecture/tooling --summary "Defines the guarded workflow for creating governed documentation."
  pnpm docs:new -- --type feature --id feature.example.create-widget \\
    --title "Create Widget" --owner example/create-widget \\
    --summary "Documents the owned Create Widget behavior and implementation boundary." \\
    --output packages/contexts/example/src/features/create-widget/README.md`);
}

function takeValue(argv, index, argument) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${argument} requires a value`);
  }
  return value;
}

export function parseArguments(argv, defaultRepositoryRoot) {
  const options = {
    blockedBy: [],
    codeAnchors: [],
    dryRun: false,
    related: [],
    repositoryRoot: process.env.DOCS_REPOSITORY_ROOT
      ? path.resolve(process.env.DOCS_REPOSITORY_ROOT)
      : defaultRepositoryRoot,
  };
  const valueArguments = new Map([
    ["--id", "id"],
    ["--output", "output"],
    ["--owner", "owner"],
    ["--slug", "slug"],
    ["--summary", "summary"],
    ["--title", "title"],
    ["--type", "type"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (argument === "--root") {
      options.repositoryRoot = path.resolve(takeValue(argv, index, argument));
      index += 1;
      continue;
    }
    if (valueArguments.has(argument)) {
      const key = valueArguments.get(argument);
      if (options[key] !== undefined) {
        throw new Error(`${argument} may be provided only once`);
      }
      options[key] = takeValue(argv, index, argument);
      index += 1;
      continue;
    }
    if (["--blocked-by", "--code-anchor", "--related"].includes(argument)) {
      const value = takeValue(argv, index, argument);
      if (argument === "--blocked-by") {
        options.blockedBy.push(value);
      } else if (argument === "--code-anchor") {
        options.codeAnchors.push(value);
      } else {
        options.related.push(value);
      }
      index += 1;
      continue;
    }
    throw new Error(`unexpected argument ${argument}`);
  }
  return options;
}

export function slugify(title) {
  return title
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

export function normalizeRepositoryPath(value) {
  return value.split(path.sep).join("/");
}

function assertRepositoryPath(repositoryRoot, value) {
  if (path.isAbsolute(value)) {
    throw new Error("--output must be repository-relative");
  }
  const absolute = path.resolve(repositoryRoot, value);
  const relative = path.relative(repositoryRoot, absolute);
  if (relative === ".." || relative.startsWith(`..${path.sep}`)) {
    throw new Error("--output must not escape the repository root");
  }
  return normalizeRepositoryPath(relative);
}

export function unique(values, label) {
  const result = [...new Set(values)];
  if (result.length !== values.length) {
    throw new Error(`${label} values must be unique`);
  }
  return result;
}

export function validateRequiredOptions(options) {
  for (const name of ["type", "id", "title", "owner", "summary"]) {
    if (!options[name]?.trim()) {
      throw new Error(`--${name} is required`);
    }
  }
  const definition = documentTypes[options.type];
  if (!definition) {
    throw new Error(
      `unsupported --type ${options.type}; expected ${Object.keys(documentTypes).join(", ")}`,
    );
  }
  if (!definition.idPattern.test(options.id)) {
    throw new Error(`--id ${options.id} is invalid for type ${options.type}`);
  }
  if (
    options.title !== options.title.trim() ||
    options.title.length > 120 ||
    /[\r\n]/.test(options.title)
  ) {
    throw new Error("--title must be one trimmed line with at most 120 characters");
  }
  if (
    options.summary !== options.summary.trim() ||
    options.summary.length < 20 ||
    options.summary.length > 180 ||
    /[\r\n]/.test(options.summary)
  ) {
    throw new Error("--summary must be one line with 20 to 180 characters");
  }
  return definition;
}

export function resolveOutput(options, definition, slug) {
  if (definition.outputRequired && !options.output) {
    throw new Error(`--output is required for type ${options.type}`);
  }
  if (!definition.outputRequired && options.output) {
    throw new Error(`--output is not supported for type ${options.type}`);
  }
  const candidate = options.output ?? definition.defaultPath({ ...options, slug });
  const repositoryPath = assertRepositoryPath(options.repositoryRoot, candidate);
  if (!repositoryPath.endsWith(".md")) {
    throw new Error("documentation output must use a .md filename");
  }
  const placementError = definition.validatePath?.(repositoryPath);
  if (placementError) {
    throw new Error(placementError);
  }
  if (!slugPattern.test(slug)) {
    throw new Error(
      "the title does not produce a valid lowercase ASCII slug; provide --slug",
    );
  }
  return repositoryPath;
}
