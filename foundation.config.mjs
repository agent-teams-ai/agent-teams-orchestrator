import { defineFoundationConfig } from "@agent-teams/engineering-foundation";

export default defineFoundationConfig({
  schemaVersion: 1,
  projectId: "agent-teams-orchestrator",
  projectKind: "service",
  capabilities: {
    architecture: {
      enabled: false,
      configPath: "architecture/package-catalog.yaml",
    },
    documentation: {
      enabled: false,
      configPath: "docs/metadata.schema.json",
    },
    lint: { enabled: false },
    reliability: {
      enabled: false,
      configPath: "architecture/reliability/reliability-catalog.yaml",
    },
    security: { enabled: false },
  },
});
