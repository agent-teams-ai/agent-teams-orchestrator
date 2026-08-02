import { parseSync, Visitor } from "oxc-parser";

function staticSpecifier(expression) {
  if (expression?.type === "Literal" && typeof expression.value === "string") {
    return expression.value;
  }
  if (
    expression?.type === "TemplateLiteral" &&
    expression.expressions.length === 0 &&
    expression.quasis.length === 1
  ) {
    const cooked = expression.quasis[0]?.value?.cooked;
    return typeof cooked === "string" ? cooked : undefined;
  }
  return;
}

function requireCallKind(callee) {
  if (callee?.type === "Identifier" && callee.name === "require") {
    return "require";
  }
  if (
    callee?.type !== "MemberExpression" ||
    callee.object?.type !== "Identifier" ||
    callee.object.name !== "module"
  ) {
    return;
  }
  if (
    (!callee.computed &&
      callee.property?.type === "Identifier" &&
      callee.property.name === "require") ||
    (callee.computed &&
      callee.property?.type === "Literal" &&
      callee.property.value === "require")
  ) {
    return "module.require";
  }
  return;
}

export function analyzeModuleSpecifiers(source, filename = "source.ts") {
  const result = parseSync(filename, source, {
    sourceType: "unambiguous",
  });
  const specifiers = new Set();
  const nonStaticModuleLoads = [];

  for (const declaration of result.module.staticImports) {
    specifiers.add(declaration.moduleRequest.value);
  }
  for (const declaration of result.module.staticExports) {
    for (const entry of declaration.entries) {
      if (entry.moduleRequest) {
        specifiers.add(entry.moduleRequest.value);
      }
    }
  }

  const collectExpression = (expression, kind, offset) => {
    const specifier = staticSpecifier(expression);
    if (specifier === undefined) {
      nonStaticModuleLoads.push({ kind, offset });
    } else {
      specifiers.add(specifier);
    }
  };

  new Visitor({
    CallExpression(node) {
      const kind = requireCallKind(node.callee);
      if (!kind) {
        return;
      }
      if (node.arguments.length !== 1) {
        nonStaticModuleLoads.push({ kind, offset: node.start });
        return;
      }
      collectExpression(node.arguments[0], kind, node.start);
    },
    ImportExpression(node) {
      collectExpression(node.source, "import", node.start);
    },
    TSImportType(node) {
      collectExpression(node.source, "type import", node.start);
    },
  }).visit(result.program);

  return {
    nonStaticModuleLoads,
    parseErrors: result.errors.map((error) => ({
      message: error.message,
      offset: error.labels[0]?.start ?? 0,
    })),
    specifiers: [...specifiers].toSorted(),
  };
}

export function extractModuleSpecifiers(source, filename) {
  return analyzeModuleSpecifiers(source, filename).specifiers;
}
