function validateReferences(document, documentsById, errors, relative) {
  for (const field of [
    "blocked_by",
    "related",
    "supersedes",
    "superseded_by",
  ]) {
    for (const targetId of document.metadata?.[field] ?? []) {
      if (targetId === document.metadata.id) {
        errors.push(
          `${relative(document.filePath)}: ${field} must not reference the document itself`,
        );
      }
      if (!documentsById.has(targetId)) {
        errors.push(
          `${relative(document.filePath)}: ${field} references unknown id ${targetId}`,
        );
      }
    }
  }
}

function validateBlockers(document, documentsById, errors, relative) {
  if (
    document.metadata?.status === "superseded" &&
    (document.metadata.superseded_by?.length ?? 0) === 0
  ) {
    errors.push(
      `${relative(document.filePath)}: superseded document must declare superseded_by`,
    );
  }
  for (const blockerId of document.metadata?.blocked_by ?? []) {
    const blocker = documentsById.get(blockerId);
    if (
      blocker?.metadata?.type !== "open-decision" ||
      !["open", "deferred"].includes(blocker.metadata.status)
    ) {
      errors.push(
        `${relative(document.filePath)}: blocked_by must reference an open or deferred decision`,
      );
    }
    if (!(document.metadata.related ?? []).includes(blockerId)) {
      errors.push(
        `${relative(document.filePath)}: blocked_by ${blockerId} must also appear in related`,
      );
    }
  }
  if (
    ["accepted", "active"].includes(document.metadata?.status) &&
    (document.metadata.blocked_by?.length ?? 0) > 0
  ) {
    errors.push(
      `${relative(document.filePath)}: accepted or active document cannot retain blocked_by`,
    );
  }
}

function validateResolution(document, documentsById, errors, relative) {
  if (document.metadata?.resolved_by) {
    if (document.metadata.type !== "open-decision") {
      errors.push(
        `${relative(document.filePath)}: resolved_by is allowed only on open decisions`,
      );
    } else {
      const decidingAdr = documentsById.get(document.metadata.resolved_by);
      if (
        decidingAdr?.metadata?.type !== "adr" ||
        !["accepted", "superseded"].includes(decidingAdr.metadata.status)
      ) {
        errors.push(
          `${relative(document.filePath)}: resolved_by must reference an accepted or superseded ADR`,
        );
      }
      if (
        !(document.metadata.related ?? []).includes(
          document.metadata.resolved_by,
        )
      ) {
        errors.push(
          `${relative(document.filePath)}: resolved_by ADR must also appear in related`,
        );
      }
    }
  }
  if (
    document.metadata?.type === "open-decision" &&
    document.metadata.status === "resolved" &&
    !document.metadata.resolved_by
  ) {
    errors.push(
      `${relative(document.filePath)}: resolved open decision requires resolved_by`,
    );
  }
  if (
    document.metadata?.type === "open-decision" &&
    document.metadata.status !== "resolved" &&
    document.metadata.resolved_by
  ) {
    errors.push(
      `${relative(document.filePath)}: unresolved open decision must not declare resolved_by`,
    );
  }
}

function validateSupersession(document, documentsById, errors, relative) {
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

export function validateDocumentRelations(context) {
  const { documents, documentsById, errors, relative } = context;
  for (const document of documents) {
    validateReferences(document, documentsById, errors, relative);
    validateBlockers(document, documentsById, errors, relative);
    validateResolution(document, documentsById, errors, relative);
    validateSupersession(document, documentsById, errors, relative);
  }
}
