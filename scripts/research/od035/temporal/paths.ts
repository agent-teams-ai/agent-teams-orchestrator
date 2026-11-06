import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const sourceDir = fileURLToPath(new URL('.', import.meta.url));
export const outputDir = resolve(process.env.SPIKE_OUTPUT_DIR ?? '.');
mkdirSync(outputDir, { recursive: true });
export const output = (name: string): string => resolve(outputDir, name);
