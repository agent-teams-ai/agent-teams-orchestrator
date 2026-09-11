import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const foundationPackageRoot = (repositoryRoot) =>
  join(repositoryRoot, "node_modules/@agent-teams/engineering-foundation");

export const loadFoundationManifest = (repositoryRoot) =>
  JSON.parse(
    readFileSync(join(foundationPackageRoot(repositoryRoot), "package.json"), "utf8"),
  );

export const importFoundation = (repositoryRoot, subpath = ".") => {
  const root = foundationPackageRoot(repositoryRoot);
  const relative = subpath === "."
    ? "dist/index.js"
    : subpath === "./scaffolding"
      ? "dist/scaffolding/index.js"
      : subpath === "./scaffolding/qualification"
        ? "dist/scaffolding/qualification.js"
        : null;
  if (relative === null) {
    throw new Error(`unsupported Foundation subpath: ${subpath}`);
  }
  return import(pathToFileURL(join(root, relative)).href);
};
