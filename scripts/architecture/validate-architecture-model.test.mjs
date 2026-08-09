import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const validatorPath = path.join(
  scriptDirectory,
  "validate-architecture-model.mjs",
);

async function createFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "agent-teams-likec4-test-"));
  await mkdir(path.join(root, "architecture"), { recursive: true });
  await cp(
    path.join(repositoryRoot, "architecture/likec4"),
    path.join(root, "architecture/likec4"),
    { recursive: true },
  );
  await cp(
    path.join(repositoryRoot, "architecture/package-catalog.yaml"),
    path.join(root, "architecture/package-catalog.yaml"),
  );
  return root;
}

function runValidator(root) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [validatorPath, "--root", root], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}

async function replaceModel(root, before, after, fileName = "model.c4") {
  const modelPath = path.join(root, "architecture/likec4", fileName);
  const source = await readFile(modelPath, "utf8");
  assert.ok(source.includes(before), `model fixture does not contain ${before}`);
  await writeFile(modelPath, source.replace(before, after));
}

test("accepts the canonical architecture model", async () => {
  const root = await createFixture();
  try {
    const result = await runValidator(root);
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /Architecture model validation passed/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("rejects bounded-context package catalog drift", async () => {
  const root = await createFixture();
  try {
    await replaceModel(
      root,
      "package_id 'context.identity-registry'",
      "package_id 'context.identity-registry-typo'",
    );
    const result = await runValidator(root);
    assert.equal(result.code, 1);
    assert.match(result.output, /missing bounded context package context\.identity-registry/);
    assert.match(result.output, /unknown bounded context package context\.identity-registry-typo/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("rejects missing relationship ownership metadata", async () => {
  const root = await createFixture();
  try {
    await replaceModel(
      root,
      "authority 'Identity owns identity; Access owns grants'",
      "authority_note 'Identity owns identity; Access owns grants'",
    );
    const result = await runValidator(root);
    assert.equal(result.code, 1);
    assert.match(result.output, /missing metadata\.authority/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("rejects duplicate semantic relationships", async () => {
  const root = await createFixture();
  try {
    const relationship = `  identityRegistry -[publishedFacts]-> accessControl 'Principal facts' {
    metadata {
      integration_style 'Published principal facts'
      authority 'Identity owns identity; Access owns grants'
      status 'proposed'
    }
  }`;
    await replaceModel(root, relationship, `${relationship}\n${relationship}`);
    const result = await runValidator(root);
    assert.equal(result.code, 1);
    assert.match(
      result.output,
      /duplicate semantic edge identityRegistry -\[publishedFacts\]-> accessControl/,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("rejects unresolved LikeC4 references", async () => {
  const root = await createFixture();
  try {
    await replaceModel(
      root,
      "identityRegistry -[publishedFacts]-> accessControl",
      "identityRegistry -[publishedFacts]-> missingContext",
    );
    const result = await runValidator(root);
    assert.equal(result.code, 1);
    assert.match(result.output, /missingContext/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("rejects a missing security trust-boundary view", async () => {
  const root = await createFixture();
  try {
    await replaceModel(
      root,
      "view securityTrustBoundaries",
      "view renamedSecurityTrustBoundaries",
      "views.c4",
    );
    const result = await runValidator(root);
    assert.equal(result.code, 1);
    assert.match(result.output, /missing the securityTrustBoundaries view/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("rejects missing security role metadata", async () => {
  const root = await createFixture();
  try {
    await replaceModel(
      root,
      "security_role 'desktop-client'",
      "security_role 'desktop-client-typo'",
      "security.c4",
    );
    const result = await runValidator(root);
    assert.equal(result.code, 1);
    assert.match(result.output, /security topology is missing role desktop-client/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("rejects a security view that collapses required trust-zone detail", async () => {
  const root = await createFixture();
  try {
    await replaceModel(
      root,
      "include securityLandscape.**",
      "include securityLandscape.*",
      "views.c4",
    );
    const result = await runValidator(root);
    assert.equal(result.code, 1);
    assert.match(
      result.output,
      /securityTrustBoundaries view omits security element/,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
