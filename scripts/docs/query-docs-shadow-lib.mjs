const maximumReportedMismatches = 20;

function projectLegacyDocument(document) {
  return {
    id: document.id,
    owner: document.owner,
    path: document.path,
    status: document.status,
    summary: document.summary,
    type: document.type,
  };
}

function projectFoundationDocument(document) {
  return {
    id: document.id,
    owner: document.owner,
    path: document.repositoryPath,
    status: document.status,
    summary: document.summary,
    type: document.type,
  };
}

function documentKey(document) {
  return `${document.id}\u0000${document.path}`;
}

export function compareQueryShadow({ foundationResult, legacyDocuments }) {
  const diagnostics = [];
  if (foundationResult.catalogStatus !== "complete") {
    diagnostics.push(
      `Foundation catalog is ${foundationResult.catalogStatus}; shadow parity requires a complete catalog.`,
    );
  }
  diagnostics.push(
    ...foundationResult.diagnostics.map(
      (diagnostic) =>
        `${diagnostic.ruleId} ${diagnostic.subject}: ${diagnostic.message}`,
    ),
  );

  const legacy = legacyDocuments.map(projectLegacyDocument);
  const foundation = foundationResult.documents.map(projectFoundationDocument);
  if (legacy.length !== foundation.length) {
    diagnostics.push(
      `Document count differs: legacy=${legacy.length}, foundation=${foundation.length}.`,
    );
  }

  const foundationByKey = new Map(
    foundation.map((document) => [documentKey(document), document]),
  );
  for (const legacyDocument of legacy) {
    if (diagnostics.length >= maximumReportedMismatches) {
      break;
    }
    const key = documentKey(legacyDocument);
    const foundationDocument = foundationByKey.get(key);
    if (JSON.stringify(legacyDocument) !== JSON.stringify(foundationDocument)) {
      diagnostics.push(
        `Document ${JSON.stringify(key)} differs: legacy=${JSON.stringify(legacyDocument)}, foundation=${JSON.stringify(foundationDocument ?? null)}.`,
      );
    }
    foundationByKey.delete(key);
  }
  for (const [key, foundationDocument] of foundationByKey) {
    if (diagnostics.length >= maximumReportedMismatches) {
      break;
    }
    diagnostics.push(
      `Document ${JSON.stringify(key)} differs: legacy=null, foundation=${JSON.stringify(foundationDocument)}.`,
    );
  }

  return {
    diagnostics,
    documentCount: foundation.length,
    ok: diagnostics.length === 0,
  };
}
