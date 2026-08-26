import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { writeFeatureReadme } from "./topology-fixture-lib.mjs";

const baselinePolicy =
  "version: 1\ndefault: deny\nedges:\n  - from: app.test\n    to: context.work-coordination\n    imports:\n      - ./module\nfeature_edges: []\n";
const validFeaturePolicy =
  "version: 1\ndefault: deny\nedges:\n  - from: app.test\n    to: context.work-coordination\n    imports:\n      - ./module\nfeature_edges:\n  - package: context.work-coordination\n    from: dependency-model\n    to: task-model\n    imports:\n      - domain\n";

export async function checkFeatureDependencyTopology(context) {
  const {
    dependencyPolicyPath,
    requireFailure,
    requireSuccess,
    run,
    temporaryRoot,
  } = context;
  const featuresRoot = path.join(
    temporaryRoot,
    "packages/contexts/work-coordination/src/features",
  );
  const taskFeatureRoot = path.join(featuresRoot, "task-model");
  const dependencyFeatureRoot = path.join(featuresRoot, "dependency-model");
  const dependencyDomainRoot = path.join(dependencyFeatureRoot, "domain");
  const taskDomainRoot = path.join(taskFeatureRoot, "domain");
  await Promise.all([
    mkdir(dependencyDomainRoot, { recursive: true }),
    mkdir(taskDomainRoot, { recursive: true }),
  ]);
  await writeFeatureReadme(dependencyFeatureRoot, {
    id: "feature.work-coordination.dependency-model",
    owner: "work-coordination/dependency-model",
    ownerDocument: "domain.contexts.work-coordination",
  });
  await writeFile(
    path.join(taskDomainRoot, "task-reference.ts"),
    "export interface TaskReference { readonly id: string; }\n",
  );
  await writeFile(
    path.join(taskDomainRoot, "internal-api.ts"),
    'export type { TaskReference } from "./task-reference.js";\n',
  );
  const dependencyDomainPath = path.join(
    dependencyDomainRoot,
    "task-dependency.ts",
  );
  await writeFile(
    dependencyDomainPath,
    'import type { TaskReference } from "../../task-model/domain/internal-api.js";\nexport type TaskDependency = TaskReference;\n',
  );
  requireFailure(
    "undeclared cross-feature dependency",
    run(temporaryRoot),
    "feature dependency context.work-coordination:dependency-model -> task-model is denied by default",
  );
  await writeFile(dependencyPolicyPath, validFeaturePolicy);
  requireSuccess("declared domain internal API edge", run(temporaryRoot));

  await writeFile(
    dependencyDomainPath,
    'import type { TaskFixture } from "@agent-teams/work-coordination";\nexport type TaskDependency = TaskFixture;\n',
  );
  requireFailure(
    "production self-package import",
    run(temporaryRoot),
    "production source cannot self-import package @agent-teams/work-coordination",
  );

  await writeFile(
    dependencyDomainPath,
    'import type { TaskReference } from "../../task-model/domain/task-reference.js";\nexport type TaskDependency = TaskReference;\n',
  );
  requireFailure(
    "cross-feature deep import",
    run(temporaryRoot),
    "must target domain/internal-api.ts or application/internal-api.ts",
  );

  const taskApplicationRoot = path.join(taskFeatureRoot, "application");
  await mkdir(taskApplicationRoot, { recursive: true });
  await writeFile(
    path.join(taskApplicationRoot, "internal-api.ts"),
    "export interface TaskLookup { readonly find: () => unknown; }\n",
  );
  await writeFile(
    dependencyDomainPath,
    'import type { TaskLookup } from "../../task-model/application/internal-api.js";\nexport type TaskDependency = TaskLookup;\n',
  );
  await writeFile(
    dependencyPolicyPath,
    validFeaturePolicy.replace("      - domain\n", "      - application\n"),
  );
  requireFailure(
    "domain imports sibling application API",
    run(temporaryRoot),
    "domain code may import only a sibling domain/internal-api.ts surface",
  );
  await rm(taskApplicationRoot, { recursive: true });
  await writeFile(
    dependencyDomainPath,
    'import type { TaskReference } from "../../task-model/domain/internal-api.js";\nexport type TaskDependency = TaskReference;\n',
  );

  const dependencyAdapterRoot = path.join(
    dependencyFeatureRoot,
    "adapters/inbound",
  );
  await mkdir(dependencyAdapterRoot, { recursive: true });
  await writeFile(
    path.join(dependencyAdapterRoot, "direct-sibling.ts"),
    'import type { TaskReference } from "../../../task-model/domain/internal-api.js";\nexport type DirectSibling = TaskReference;\n',
  );
  await writeFile(dependencyPolicyPath, validFeaturePolicy);
  requireFailure(
    "adapter imports sibling internal API",
    run(temporaryRoot),
    "adapters cannot import sibling feature task-model",
  );
  await rm(path.join(dependencyFeatureRoot, "adapters"), { recursive: true });

  await writeFile(
    dependencyPolicyPath,
    validFeaturePolicy.replace(
      "      - domain\n",
      "      - domain\n      - application\n",
    ),
  );
  requireFailure(
    "unused feature surface",
    run(temporaryRoot),
    "declares unused application surface",
  );
  await writeFile(
    dependencyPolicyPath,
    `${validFeaturePolicy}  - package: context.work-coordination\n    from: task-model\n    to: dependency-model\n    imports:\n      - domain\n`,
  );
  requireFailure(
    "feature dependency cycle",
    run(temporaryRoot),
    "feature dependency cycle context.work-coordination",
  );

  await writeFile(
    path.join(dependencyFeatureRoot, "module.ts"),
    "export {};\n",
  );
  await writeFile(dependencyPolicyPath, validFeaturePolicy);
  requireFailure(
    "ambiguous feature module name",
    run(temporaryRoot),
    "generic feature module.ts is prohibited",
  );
  await rm(path.join(dependencyFeatureRoot, "module.ts"));
  await mkdir(path.join(dependencyFeatureRoot, "tests"), { recursive: true });
  await writeFile(
    path.join(dependencyFeatureRoot, "tests/integration.test.ts"),
    "export {};\n",
  );
  requireFailure(
    "detached tests inside production feature",
    run(temporaryRoot),
    "tests belong under package-level tests/features",
  );

  await Promise.all([
    rm(dependencyFeatureRoot, { recursive: true }),
    rm(taskDomainRoot, { recursive: true }),
  ]);
  await writeFile(dependencyPolicyPath, baselinePolicy);
  requireSuccess("restored feature dependency policy", run(temporaryRoot));
}
