import { JSDOM } from "jsdom";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

try {
  const diagrams = JSON.parse(await readStdin());
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    // This process validates grammar and never renders user-controlled HTML.
    securityLevel: "loose",
    flowchart: {
      htmlLabels: false,
    },
  });

  const results = [];
  for (const diagram of diagrams) {
    try {
      await mermaid.parse(diagram.source);
      results.push({
        key: diagram.key,
        valid: true,
      });
    } catch (error) {
      results.push({
        error: error instanceof Error ? error.message : String(error),
        key: diagram.key,
        valid: false,
      });
    }
  }

  console.log(JSON.stringify(results));
  dom.window.close();
  process.exit(0);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
