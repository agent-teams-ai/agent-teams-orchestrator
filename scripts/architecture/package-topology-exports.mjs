import path from "node:path";

export function stringTargets(value) {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(stringTargets);
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(stringTargets);
  }
  return [];
}

function isObjectRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNormalizedBuiltExportTarget(target) {
  if (typeof target !== "string" || !target.startsWith("./dist/")) {
    return false;
  }
  if (/%(?:2e|2f|5c)/iu.test(target)) {
    return false;
  }
  return `./${path.posix.normalize(target.slice(2))}` === target;
}

function isDeclarationExportTarget(target) {
  return (
    isNormalizedBuiltExportTarget(target) &&
    /\.d\.(?:c|m)?ts$/u.test(target)
  );
}

function isEsmExportTarget(target) {
  return (
    isNormalizedBuiltExportTarget(target) && /\.(?:js|mjs)$/u.test(target)
  );
}

export function validateQualifiedLibraryExports(entry, exportsField, errors) {
  const packageJson = `${entry.path}/package.json`;
  const rootExport = isObjectRecord(exportsField)
    ? exportsField["."]
    : undefined;
  if (!isObjectRecord(rootExport)) {
    errors.push(
      `${packageJson}: library root export requires built types and import targets`,
    );
  }
  if (!isObjectRecord(exportsField)) {
    return;
  }

  for (const [exportKey, exportValue] of Object.entries(exportsField)) {
    if (!exportKey.startsWith(".") || exportValue === null) {
      continue;
    }
    if (!isObjectRecord(exportValue)) {
      errors.push(
        `${packageJson}: library export ${exportKey} requires built declaration and ESM import targets`,
      );
      continue;
    }
    if (!isDeclarationExportTarget(exportValue.types)) {
      errors.push(
        `${packageJson}: library export ${exportKey} requires a normalized dist declaration target`,
      );
    }
    if (!isEsmExportTarget(exportValue.import)) {
      errors.push(
        `${packageJson}: library export ${exportKey} requires a normalized dist ESM import target`,
      );
    }
  }
}

export function isNormalizedBuiltExport(target) {
  return isNormalizedBuiltExportTarget(target);
}

export function normalizedRootReference(referencePath) {
  if (
    typeof referencePath !== "string" ||
    path.posix.isAbsolute(referencePath) ||
    path.win32.isAbsolute(referencePath) ||
    /^[a-z]:/iu.test(referencePath)
  ) {
    return null;
  }
  let normalized = path.posix.normalize(referencePath.replaceAll("\\", "/"));
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  if (normalized.endsWith("/tsconfig.json")) {
    normalized = normalized.slice(0, -"/tsconfig.json".length);
  }
  const withoutPrefix = normalized.startsWith("./")
    ? normalized.slice(2)
    : normalized;
  if (withoutPrefix === ".." || withoutPrefix.startsWith("../")) {
    return null;
  }
  return withoutPrefix;
}

export function packageNameFromSpecifier(specifier) {
  const match = specifier.match(/^(@agent-teams\/[^/]+)(?:\/.*)?$/);
  return match?.[1];
}

function exportKeyMatches(exportKey, requestedKey) {
  if (exportKey === requestedKey) {
    return true;
  }
  const wildcardIndex = exportKey.indexOf("*");
  if (wildcardIndex === -1) {
    return false;
  }
  return (
    requestedKey.startsWith(exportKey.slice(0, wildcardIndex)) &&
    requestedKey.endsWith(exportKey.slice(wildcardIndex + 1))
  );
}

function hasExportTarget(value) {
  if (typeof value === "string") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(hasExportTarget);
  }
  if (value && typeof value === "object") {
    return Object.values(value).some(hasExportTarget);
  }
  return false;
}

export function isExportedSubpath(exportsField, requestedKey) {
  if (typeof exportsField === "string" || Array.isArray(exportsField)) {
    return requestedKey === "." && hasExportTarget(exportsField);
  }
  if (!exportsField || typeof exportsField !== "object") {
    return false;
  }

  const exportKeys = Object.keys(exportsField);
  const subpathKeys = exportKeys.filter((key) => key.startsWith("."));
  if (subpathKeys.length === 0) {
    return requestedKey === "." && hasExportTarget(exportsField);
  }
  if (Object.hasOwn(exportsField, requestedKey)) {
    return hasExportTarget(exportsField[requestedKey]);
  }
  const matchingPatterns = subpathKeys
    .filter(
      (key) => key.includes("*") && exportKeyMatches(key, requestedKey),
    )
    .toSorted((left, right) => {
      const leftWildcard = left.indexOf("*");
      const rightWildcard = right.indexOf("*");
      return (
        rightWildcard - leftWildcard ||
        right.length - left.length ||
        left.localeCompare(right)
      );
    });
  return (
    matchingPatterns.length > 0 &&
    hasExportTarget(exportsField[matchingPatterns[0]])
  );
}
