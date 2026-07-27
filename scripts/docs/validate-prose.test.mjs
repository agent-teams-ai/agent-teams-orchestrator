import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const valeRunnerPath = path.join(scriptDirectory, "run-vale.mjs");
const cspellCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
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
      resolve({ code, output });
    });
    if (input !== undefined) {
      child.stdin.end(input);
    }
  });
}

async function withMarkdownFixture(content, assertion) {
  const directory = await mkdtemp(
    path.join(tmpdir(), "agent-teams-orchestrator-prose-"),
  );
  const filePath = path.join(directory, "fixture.md");
  try {
    await writeFile(filePath, content);
    await assertion(filePath);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

test("Vale rejects noncanonical project terminology", async () => {
  await withMarkdownFixture(
    "# Fixture\n\nGithub is intentionally misspelled here.\n",
    async (filePath) => {
      const result = await run(process.execPath, [valeRunnerPath, filePath]);
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /AgentTeams\.Terminology/);
      assert.match(result.output, /GitHub/);
    },
  );
});

test("CSpell rejects an unknown spelling error", async () => {
  const result = await run(
    cspellCommand,
    [
      "exec",
      "cspell",
      "--config",
      ".cspell.json",
      "--no-config-search",
      "--no-progress",
      "stdin://docs/prose-fixture.md",
    ],
    "# Fixture\n\nThis sentence contains a documentatoin error.\n",
  );
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /documentatoin/);
});

test("the project dictionary is sorted and unique", async () => {
  const dictionaryPath = path.join(
    repositoryRoot,
    ".cspell",
    "project-words.txt",
  );
  const words = (await readFile(dictionaryPath, "utf8"))
    .split(/\r?\n/u)
    .filter(Boolean);
  const normalizedWords = words.map((word) => word.toLocaleLowerCase("en"));

  assert.deepEqual(
    normalizedWords,
    [...normalizedWords].sort(),
    "project dictionary must be sorted case-insensitively",
  );
  assert.equal(
    new Set(normalizedWords).size,
    normalizedWords.length,
    "project dictionary must not contain case-insensitive duplicates",
  );
});
