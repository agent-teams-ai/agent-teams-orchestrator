const packageIdPattern =
  /^(app|context|integration|platform|sdk|testing)\.[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/u;
const packageNamePattern = /^@agent-teams\/[a-z][a-z0-9-]*$/u;
const ownerDocumentIdPattern =
  /^(ADR-[0-9]{4}|OD-[0-9]{3}|[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+)$/u;
const rolePathPatterns = {
  app: /^apps\/[^/]+$/u,
  "bounded-context": /^packages\/contexts\/[^/]+$/u,
  integration: /^packages\/integrations\/.+$/u,
  platform: /^packages\/platform\/[^/]+$/u,
  sdk: /^packages\/sdk\/[^/]+$/u,
  testing: /^packages\/testing\/[^/]+$/u,
};

export function validateOrchestratorCatalogEntry(entry, errors) {
  if (!packageIdPattern.test(entry.id)) {
    errors.push(
      `architecture/package-catalog.yaml: ${entry.id} is not a valid Orchestrator package ID`,
    );
  }

  const expectedPath = rolePathPatterns[entry.role];
  if (!expectedPath?.test(entry.path)) {
    errors.push(
      `architecture/package-catalog.yaml: ${entry.id} path ${entry.path} does not match role ${entry.role}`,
    );
  }

  if (!packageNamePattern.test(entry.package_name)) {
    errors.push(
      `architecture/package-catalog.yaml: ${entry.id} package_name ${entry.package_name} is not a valid Orchestrator package name`,
    );
  }

  if (!ownerDocumentIdPattern.test(entry.owner_document)) {
    errors.push(
      `architecture/package-catalog.yaml: ${entry.id} owner_document ${entry.owner_document} is not a valid Orchestrator document ID`,
    );
  }
}
