import { getTask } from "./adapters/inbound/http/get-task.js";
import { taskReader } from "./adapters/outbound/persistence/task-reader.js";

export function createTaskFeature() {
  return {
    getTask: (id: string) => getTask(taskReader, id),
  };
}
