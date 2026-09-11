import type { Task } from "../domain/index.js";

export interface TaskReader {
  getById(id: string): Promise<Task | null>;
}
