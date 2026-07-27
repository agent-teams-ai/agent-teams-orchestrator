import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const impactCheckerPath = path.join(scriptDirectory, "check-doc-impact.mjs");
const validFixturePath = path.join(scriptDirectory, "fixtures/valid");

async function createFixture(enforcement) {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "agent-teams-doc-impact-"),
  );
  await cp(validFixturePath, fixtureRoot, { recursive: true });
  await mkdir(path.join(fixtureRoot, "src"), { recursive: true });
  await writeFile(path.join(fixtureRoot, "src/example.ts"), "export {};\n");

  const documentPath = path.join(fixtureRoot, "docs/glossary.md");
  const source = await readFile(documentPath, "utf8");
  await writeFile(
    documentPath,
    source.replace(
      "summary: Minimal glossary document used by documentation validator fixtures.\n",
      `summary: Minimal glossary document used by documentation validator fixtures.\ncode_anchors:\n  - pattern: src/**\n    enforcement: ${enforcement}\n`,
    ),
  );
  return fixtureRoot;
}

function runChecker(fixtureRoot, arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [impactCheckerPath, "--root", fixtureRoot, ...arguments_],
      {
        cwd: fixtureRoot,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
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

function runGit(fixtureRoot, arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", arguments_, {
      cwd: fixtureRoot,
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
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(output));
      }
    });
  });
}

test("reports advisory documentation impact without blocking", async () => {
  const fixtureRoot = await createFixture("advisory");
  try {
    const result = await runChecker(fixtureRoot, [
      "--path",
      "src/example.ts",
      "--strict",
    ]);
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /ADVISORY fixture\.glossary/);
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});

test("blocks a missing required documentation update", async () => {
  const fixtureRoot = await createFixture("required");
  try {
    const result = await runChecker(fixtureRoot, [
      "--path",
      "src/example.ts",
      "--strict",
    ]);
    assert.equal(result.code, 1);
    assert.match(result.output, /1 required document\(s\) were not updated/);
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});

test("accepts a required impact when the owning document changed", async () => {
  const fixtureRoot = await createFixture("required");
  try {
    const result = await runChecker(fixtureRoot, [
      "--path",
      "src/example.ts",
      "--path",
      "docs/glossary.md",
      "--strict",
    ]);
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /document updated/);
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});

test("detects required impact from a Git merge-base range", async () => {
  const fixtureRoot = await createFixture("required");
  try {
    await runGit(fixtureRoot, ["init", "--quiet"]);
    await runGit(fixtureRoot, ["config", "user.email", "fixture@example.com"]);
    await runGit(fixtureRoot, ["config", "user.name", "Fixture"]);
    await runGit(fixtureRoot, ["add", "."]);
    await runGit(fixtureRoot, ["commit", "--quiet", "-m", "fixture baseline"]);
    const base = await runGit(fixtureRoot, ["rev-parse", "HEAD"]);
    await writeFile(
      path.join(fixtureRoot, "src/example.ts"),
      "export const changed = true;\n",
    );
    await runGit(fixtureRoot, ["add", "src/example.ts"]);
    await runGit(fixtureRoot, ["commit", "--quiet", "-m", "change source"]);

    const result = await runChecker(fixtureRoot, [
      "--base",
      base,
      "--strict",
    ]);
    assert.equal(result.code, 1);
    assert.match(result.output, /1 required document\(s\) were not updated/);
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});
