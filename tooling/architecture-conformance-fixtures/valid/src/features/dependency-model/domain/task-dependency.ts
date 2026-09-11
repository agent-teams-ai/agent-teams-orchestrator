import type { Task } from "../../task-model/domain/internal-api.js";

export interface TaskDependency {
  readonly task: Task;
}
