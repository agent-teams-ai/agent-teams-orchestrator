import type { Task } from "../domain/index.js";

export function ImportLabel({ task }: { task: Task }) {
  return <span>What happens when you import task {task.id}?</span>;
}
