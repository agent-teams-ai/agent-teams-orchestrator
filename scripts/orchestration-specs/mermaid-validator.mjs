import { spawn } from "node:child_process";

export function validateMermaid(diagrams, options) {
  const { promise, resolve } = Promise.withResolvers();
  const child = spawn(process.execPath, [options.validatorPath], {
    cwd: options.repositoryRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let settled = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, 120_000);
  const resolveOnce = (result) => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(timeout);
    resolve(result);
  };
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.on("error", (error) => {
    resolveOnce({ error: error.message, results: null });
  });
  child.on("close", (code) => {
    if (timedOut || code !== 0) {
      resolveOnce({
        error: timedOut
          ? "parser timed out after 120 seconds"
          : stderr.trim() || `parser exited with code ${code}`,
        results: null,
      });
      return;
    }
    try {
      resolveOnce({ error: null, results: JSON.parse(stdout) });
    } catch (error) {
      resolveOnce({
        error: `parser returned invalid JSON: ${error.message}`,
        results: null,
      });
    }
  });
  child.stdin.end(JSON.stringify(diagrams));
  return promise;
}
