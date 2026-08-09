import fs from "node:fs";

import { schemaPath, specPaths } from "./paths.mjs";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));

export const loadSchema = () => readJson(schemaPath);

export const loadSpecs = () => specPaths.map(readJson);
