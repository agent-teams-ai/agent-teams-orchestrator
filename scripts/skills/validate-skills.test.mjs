import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const validatorPath = path.join(scriptDirectory, "validate-skills.mjs");

async function createFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "agent-teams-skills-"));
  const skillDirectory = path.join(root, ".agents/skills/example-skill");
  await mkdir(path.join(skillDirectory, "agents"), { recursive: true });
  await mkdir(path.join(skillDirectory, "references"), { recursive: true });
  await writeFile(path.join(skillDirectory, "references/guide.md"), "# Guide\n");
  await writeFile(
    path.join(skillDirectory, "SKILL.md"),
    `---\nname: example-skill\ndescription: Use when validating a repository-local skill fixture.\n---\n\n# Example Skill\n\nRead [the guide](references/guide.md).\n`,
  );
  await writeFile(
    path.join(skillDirectory, "agents/openai.yaml"),
    `interface:\n  display_name: Example Skill\n  short_description: Validate a local skill fixture\n  default_prompt: Validate this skill fixture.\n`,
  );
  return { root, skillDirectory };
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

test("accepts a valid repository-local skill", async () => {
  const fixture = await createFixture();
  try {
    const result = await runValidator(fixture.root);
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /Skill validation passed/);
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("rejects skill-name drift", async () => {
  const fixture = await createFixture();
  try {
    await writeFile(
      path.join(fixture.skillDirectory, "SKILL.md"),
      `---\nname: wrong-name\ndescription: Use when validating a repository-local skill fixture.\n---\n\n# Example Skill\n`,
    );
    const result = await runValidator(fixture.root);
    assert.equal(result.code, 1);
    assert.match(result.output, /must match folder example-skill/);
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("rejects broken skill-local links", async () => {
  const fixture = await createFixture();
  try {
    await writeFile(
      path.join(fixture.skillDirectory, "SKILL.md"),
      `---\nname: example-skill\ndescription: Use when validating a repository-local skill fixture.\n---\n\n# Example Skill\n\nRead [missing](references/missing.md).\n`,
    );
    const result = await runValidator(fixture.root);
    assert.equal(result.code, 1);
    assert.match(result.output, /broken local link references\/missing\.md/);
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("rejects a docs-authoring skill that drops a required workflow route", async () => {
  const fixture = await createFixture();
  try {
    const docsSkillDirectory = path.join(
      fixture.root,
      ".agents/skills/docs-authoring",
    );
    await rename(fixture.skillDirectory, docsSkillDirectory);
    await writeFile(
      path.join(docsSkillDirectory, "SKILL.md"),
      `---\nname: docs-authoring\ndescription: Use when authoring governed documentation through the canonical repository workflow.\n---\n\n# Documentation Authoring\n\nUse pnpm docs:info, pnpm docs:find, pnpm docs:new -- --type TYPE --id ID --dry-run, pnpm docs:new -- --type TYPE --id ID --apply, the reported index/link, pnpm docs:check, and pnpm docs:doctor.\n`,
    );
    const result = await runValidator(fixture.root);
    assert.equal(result.code, 1, result.output);
    assert.match(
      result.output,
      /canonical documentation workflow must route pnpm docs:recover/,
    );
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});
