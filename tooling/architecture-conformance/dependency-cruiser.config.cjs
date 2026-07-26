const path = require("node:path");

module.exports = {
  forbidden: [
    {
      name: "no-circular-dependencies",
      severity: "error",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "no-unresolvable-dependencies",
      severity: "error",
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
    {
      name: "domain-must-not-depend-on-outer-layers",
      severity: "error",
      from: {
        path: "(^|/)domain/",
      },
      to: {
        path: "(^|/)(application|contracts|adapters|composition|projections)/",
      },
    },
    {
      name: "application-must-not-depend-on-adapters",
      severity: "error",
      from: {
        path: "(^|/)application/",
      },
      to: {
        path: "(^|/)(adapters|composition)/",
      },
    },
    {
      name: "contracts-must-not-depend-on-core-or-adapters",
      severity: "error",
      from: {
        path: "(^|/)contracts/",
      },
      to: {
        path: "(^|/)(domain|application|adapters|composition|projections)/",
      },
    },
  ],
  options: {
    combinedDependencies: true,
    detectJSDocImports: false,
    doNotFollow: {
      path: "(^|/)node_modules/",
      dependencyTypes: ["npm", "npm-dev", "npm-optional", "npm-peer"],
    },
    enhancedResolveOptions: {
      conditionNames: ["import", "require", "node", "default"],
      exportsFields: ["exports"],
    },
    exclude: [
      "(^|/)node_modules/",
      "(^|/)dist/",
      "(^|/)coverage/",
    ],
    parser: "tsc",
    skipAnalysisNotInRules: true,
    tsConfig: {
      fileName: path.resolve(__dirname, "../../tsconfig.architecture.json"),
    },
    tsPreCompilationDeps: false,
  },
};
