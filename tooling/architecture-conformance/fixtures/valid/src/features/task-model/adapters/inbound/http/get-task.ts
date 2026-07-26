import type { TaskReader } from "../../../application/load-task.js";

export async function getTask(reader: TaskReader, id: string) {
  return reader.getById(id);
}
