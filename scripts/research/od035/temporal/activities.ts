import { writeFileSync, existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import * as business from './business.ts';
import { output } from './paths.ts';

export const readState = business.readState;
export const timerFired = business.timerFired;
export async function activate(id: string, commandId: string): Promise<businessState> {
  if (process.env.PAUSE_BEFORE_COMMIT_RUN === id) {
    writeFileSync(output(`paused-${id}.json`), JSON.stringify({ pid: process.pid, id }));
    // Test driver SIGSTOPs this whole process before the acceptance transaction.
    await delay(1500);
  }
  const result = await business.activate(id, commandId);
  const marker = output(`committed-${id}.json`);
  if (process.env.CRASH_AFTER_COMMIT_RUN === id && !existsSync(marker)) {
    writeFileSync(marker, JSON.stringify({ pid: process.pid, id, result }));
    process.kill(process.pid, 'SIGKILL');
    await delay(60000);
  }
  return result;
}
type businessState = Awaited<ReturnType<typeof business.readState>>;
