import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import YAML from "yaml";

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(remarkGfm);

export function parseMarkdown(source) {
  return markdownProcessor.parse(source.replaceAll("\r\n", "\n"));
}

export function parseFrontmatter(tree) {
  const frontmatter = tree.children[0];
  if (
    frontmatter?.type !== "yaml" ||
    frontmatter.position?.start.line !== 1
  ) {
    return {
      error: "missing YAML frontmatter",
      metadata: null,
    };
  }

  try {
    return {
      error: null,
      metadata: YAML.parse(frontmatter.value),
    };
  } catch (error) {
    return {
      error: `invalid YAML: ${error.message}`,
      metadata: null,
    };
  }
}
