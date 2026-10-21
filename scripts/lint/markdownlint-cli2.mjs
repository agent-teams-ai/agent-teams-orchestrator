export default {
  globs: [
    "README.md",
    "AGENTS.md",
    "docs/**/*.md",
    "packages/contexts/agent-context/README.md",
    "packages/contexts/agent-context/src/features/sandbox-manifest/README.md", "packages/contexts/execution-observation/README.md", "packages/contexts/execution-observation/src/features/sandbox-activity/README.md",
  ],
  config: {
    "line-length": false,
    "no-duplicate-heading": {
      siblings_only: true,
    },
    "first-line-h1": false,
    "table-column-style": false,
  },
};
