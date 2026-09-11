import type { TaskReader } from "../../../application/load-task.js";
import YAML from "yaml";

export const adapterFixtureCanUseExternalLibraries = YAML;

export const taskReader: TaskReader = {
  async getById() {
    return null;
  },
};
