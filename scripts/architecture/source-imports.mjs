const identifierStartPattern = /[A-Za-z_$]/;
const identifierPartPattern = /[0-9A-Za-z_$]/;

function isIdentifierStart(character) {
  return character !== undefined && identifierStartPattern.test(character);
}

function isIdentifierPart(character) {
  return character !== undefined && identifierPartPattern.test(character);
}

function readString(source, start, quote) {
  let index = start + 1;
  let value = "";
  let hasEscape = false;

  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      hasEscape = true;
      const escaped = source[index + 1];
      if (escaped === undefined) {
        return { end: source.length, start, type: "invalid-string", value };
      }
      value += escaped;
      index += 2;
      continue;
    }
    if (character === quote) {
      return {
        end: index + 1,
        start,
        type: hasEscape ? "escaped-string" : "string",
        value,
      };
    }
    value += character;
    index += 1;
  }

  return { end: source.length, start, type: "invalid-string", value };
}

function readTemplate(source, start) {
  let index = start + 1;
  let value = "";
  let hasEscape = false;
  let hasSubstitution = false;

  while (index < source.length) {
    if (source[index] === "\\") {
      hasEscape = true;
      const escaped = source[index + 1];
      if (escaped === undefined) {
        return {
          end: source.length,
          start,
          type: "invalid-template",
          value,
        };
      }
      value += escaped;
      index += 2;
      continue;
    }
    if (source[index] === "`") {
      return {
        end: index + 1,
        start,
        type: hasSubstitution
          ? "dynamic-template"
          : hasEscape
            ? "escaped-template"
            : "string",
        value,
      };
    }
    if (source[index] === "$" && source[index + 1] === "{") {
      hasSubstitution = true;
    }
    value += source[index];
    index += 1;
  }

  return {
    end: source.length,
    start,
    type: "invalid-template",
    value,
  };
}

function tokenize(source) {
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (character === "/" && next === "/") {
      index = source.indexOf("\n", index + 2);
      if (index === -1) {
        break;
      }
      continue;
    }
    if (character === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    if (character === "'" || character === '"') {
      const token = readString(source, index, character);
      tokens.push(token);
      index = token.end;
      continue;
    }
    if (character === "`") {
      const token = readTemplate(source, index);
      tokens.push(token);
      index = token.end;
      continue;
    }
    if (isIdentifierStart(character)) {
      let end = index + 1;
      while (isIdentifierPart(source[end])) {
        end += 1;
      }
      tokens.push({
        end,
        start: index,
        type: "identifier",
        value: source.slice(index, end),
      });
      index = end;
      continue;
    }

    tokens.push({
      end: index + 1,
      start: index,
      type: "punctuator",
      value: character,
    });
    index += 1;
  }

  return tokens;
}

function stringAfter(tokens, index) {
  const token = tokens[index];
  return token?.type === "string" ? token.value : undefined;
}

function isRejectedModuleString(token) {
  return new Set([
    "dynamic-template",
    "escaped-string",
    "escaped-template",
    "invalid-string",
    "invalid-template",
  ]).has(token?.type);
}

function staticCallSpecifier(tokens, index, allowOptions) {
  const specifier = stringAfter(tokens, index);
  const terminator = tokens[index + 1]?.value;
  if (
    specifier !== undefined &&
    (terminator === ")" || (allowOptions && terminator === ","))
  ) {
    return specifier;
  }
  return;
}

export function analyzeModuleSpecifiers(source) {
  const tokens = tokenize(source);
  const specifiers = new Set();
  const nonStaticModuleLoads = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "identifier") {
      continue;
    }

    if (token.value === "require" && tokens[index + 1]?.value === "(") {
      const specifier = staticCallSpecifier(tokens, index + 2, false);
      if (specifier !== undefined) {
        specifiers.add(specifier);
      } else {
        nonStaticModuleLoads.push({ kind: "require", offset: token.start });
      }
      continue;
    }

    if (token.value === "import") {
      if (tokens[index + 1]?.value === "(") {
        const specifier = staticCallSpecifier(tokens, index + 2, true);
        if (specifier !== undefined) {
          specifiers.add(specifier);
        } else {
          nonStaticModuleLoads.push({ kind: "import", offset: token.start });
        }
        continue;
      }

      const sideEffectSpecifier = stringAfter(tokens, index + 1);
      if (sideEffectSpecifier !== undefined) {
        specifiers.add(sideEffectSpecifier);
        continue;
      }
      if (isRejectedModuleString(tokens[index + 1])) {
        nonStaticModuleLoads.push({ kind: "import", offset: token.start });
        continue;
      }
    } else if (token.value !== "export") {
      continue;
    }

    for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
      const candidate = tokens[cursor];
      if (candidate.value === ";") {
        break;
      }
        if (candidate.type === "identifier" && candidate.value === "from") {
          const specifier = stringAfter(tokens, cursor + 1);
          if (specifier !== undefined) {
            specifiers.add(specifier);
          } else if (isRejectedModuleString(tokens[cursor + 1])) {
            nonStaticModuleLoads.push({
              kind: token.value,
              offset: token.start,
            });
          }
          break;
        }
    }
  }

  return {
    nonStaticModuleLoads,
    specifiers: [...specifiers].toSorted(),
  };
}

export function extractModuleSpecifiers(source) {
  return analyzeModuleSpecifiers(source).specifiers;
}
