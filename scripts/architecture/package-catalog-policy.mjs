import path from "node:path";

const packageIdPattern =
  /^(app|context|integration|platform|sdk|testing)\.[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/u;
const packageNamePattern = /^@agent-teams\/[a-z][a-z0-9-]*$/u;
const ownerDocumentIdPattern =
  /^(ADR-[0-9]{4}|OD-[0-9]{3}|[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+)$/u;
const pathSegmentPattern = /^[a-z][a-z0-9-]*$/u;
const fieldLimits = {
  id: 160,
  package_name: 214,
  owner_document: 160,
  path: 512,
  role: 160,
};
const maximumDiagnosticValueLength = 240;
const maximumDiagnosticFields = 12;
const maximumPackages = 4096;
const stableRuleIdPattern =
  /^orchestrator\.catalog(?:\.[a-z][a-z0-9-]*)+$/u;
const diagnosticFieldPattern = /^[a-z][a-z0-9-]*$/u;

function plainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnsafeControl(character) {
  const codePoint = character.codePointAt(0);
  return (
    codePoint <= 0x1f ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    codePoint === 0x2028 ||
    codePoint === 0x2029
  );
}

function hasUnsafeControl(value) {
  return [...value].some(isUnsafeControl);
}

function escapedControl(character) {
  return `\\u${character.codePointAt(0).toString(16).padStart(4, "0")}`;
}

export function sanitizeCatalogDiagnosticValue(value) {
  let source = value;
  if (typeof source !== "string") {
    if (source === null) {
      source = "null";
    } else if (source === undefined) {
      source = "undefined";
    } else if (typeof source === "boolean" || typeof source === "number") {
      source = String(source);
    } else if (Array.isArray(source)) {
      source = "[array]";
    } else if (typeof source === "object") {
      source = "[object]";
    } else {
      source = `[${typeof source}]`;
    }
  }

  let escaped = "";
  let consumedCodeUnits = 0;
  for (const character of source) {
    const replacement = isUnsafeControl(character)
      ? escapedControl(character)
      : character;
    if (escaped.length + replacement.length > maximumDiagnosticValueLength) {
      break;
    }
    escaped += replacement;
    consumedCodeUnits += character.length;
  }
  return consumedCodeUnits === source.length ? escaped : `${escaped}…`;
}

export function catalogDiagnostic(ruleId, fields = {}) {
  const stableRuleId =
    typeof ruleId === "string" &&
    ruleId.length <= 160 &&
    stableRuleIdPattern.test(ruleId)
      ? ruleId
      : "orchestrator.catalog.diagnostic.invalid-rule";
  const details = [];
  if (plainObject(fields)) {
    for (const name in fields) {
      if (details.length >= maximumDiagnosticFields) {
        break;
      }
      if (!Object.hasOwn(fields, name)) {
        continue;
      }
      const stableName =
        name.length <= 80 && diagnosticFieldPattern.test(name)
          ? name
          : `field-${details.length + 1}`;
      const descriptor = Object.getOwnPropertyDescriptor(fields, name);
      const value = descriptor && "value" in descriptor
        ? descriptor.value
        : "[accessor]";
      details.push(
        `${stableName}=${JSON.stringify(sanitizeCatalogDiagnosticValue(value))}`,
      );
    }
  }
  return [`[${stableRuleId}]`, ...details].join(" ");
}

function append(errors, ruleId, fields) {
  errors.push(catalogDiagnostic(ruleId, fields));
}

function validateBoundedString(entry, field, index, errors) {
  const value = entry[field];
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > fieldLimits[field] ||
    hasUnsafeControl(value)
  ) {
    append(errors, "orchestrator.catalog.entry.bounded-string", {
      field,
      index,
      maximum: fieldLimits[field],
      value,
    });
    return false;
  }
  return true;
}

function hasSecurePathShape(value) {
  if (
    path.posix.isAbsolute(value) ||
    value.includes("\\") ||
    path.posix.normalize(value) !== value
  ) {
    return false;
  }
  const segments = value.split("/");
  return (
    segments.length > 0 &&
    segments.every(
      (segment) =>
        segment !== "" &&
        segment !== "." &&
        segment !== ".." &&
        pathSegmentPattern.test(segment),
    )
  );
}

function matchesRolePath(role, value) {
  const segments = value.split("/");
  if (role === "app") {
    return segments.length === 2 && segments[0] === "apps";
  }
  if (segments[0] !== "packages") {
    return false;
  }
  const roleRoot = {
    "bounded-context": "contexts",
    integration: "integrations",
    platform: "platform",
    sdk: "sdk",
    testing: "testing",
  }[role];
  if (segments[1] !== roleRoot) {
    return false;
  }
  return role === "integration" ? segments.length >= 3 : segments.length === 3;
}

function validateEntry(entry, index, errors) {
  if (!plainObject(entry)) {
    append(errors, "orchestrator.catalog.entry.object", { index, value: entry });
    return;
  }

  const validFields = Object.fromEntries(
    Object.keys(fieldLimits).map((field) => [
      field,
      validateBoundedString(entry, field, index, errors),
    ]),
  );
  if (validFields.id && !packageIdPattern.test(entry.id)) {
    append(errors, "orchestrator.catalog.entry.id", {
      index,
      value: entry.id,
    });
  }
  if (validFields.package_name && !packageNamePattern.test(entry.package_name)) {
    append(errors, "orchestrator.catalog.entry.package-name", {
      index,
      value: entry.package_name,
    });
  }
  if (
    validFields.owner_document &&
    !ownerDocumentIdPattern.test(entry.owner_document)
  ) {
    append(errors, "orchestrator.catalog.entry.owner-document", {
      index,
      value: entry.owner_document,
    });
  }
  if (validFields.path && !hasSecurePathShape(entry.path)) {
    append(errors, "orchestrator.catalog.entry.secure-path", {
      index,
      value: entry.path,
    });
    return;
  }
  if (
    validFields.path &&
    validFields.role &&
    !matchesRolePath(entry.role, entry.path)
  ) {
    append(errors, "orchestrator.catalog.entry.role-path", {
      index,
      path: entry.path,
      role: entry.role,
    });
  }
}

export function validateOrchestratorPackageCatalog(catalog, errors) {
  if (!plainObject(catalog)) {
    append(errors, "orchestrator.catalog.envelope.object", { value: catalog });
    return false;
  }
  if (catalog.version !== 1) {
    append(errors, "orchestrator.catalog.envelope.version", {
      value: catalog.version,
    });
  }
  if (!Array.isArray(catalog.packages)) {
    append(errors, "orchestrator.catalog.envelope.packages", {
      value: catalog.packages,
    });
    return false;
  }
  if (catalog.packages.length > maximumPackages) {
    append(errors, "orchestrator.catalog.envelope.package-count", {
      count: catalog.packages.length,
      maximum: maximumPackages,
    });
  }
  for (const [index, entry] of catalog.packages
    .slice(0, maximumPackages)
    .entries()) {
    validateEntry(entry, index, errors);
  }
  return errors.length === 0;
}
