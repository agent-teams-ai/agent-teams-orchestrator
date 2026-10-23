import { Worker, NativeConnection, Runtime, DefaultLogger } from '@temporalio/worker';
import { resolve } from 'node:path';
import * as activities from './activities.ts';
import { sourceDir } from './paths.ts';

async function main(): Promise<void> {
  Runtime.install({ logger: new DefaultLogger('WARN') });
  const connection = await NativeConnection.connect({ address: '127.0.0.1:27233' });
  const worker = await Worker.create({
    connection, namespace: 'od035', taskQueue: process.env.TASK_QUEUE ?? 'od035-temporal',
    workflowsPath: resolve(sourceDir, `workflows-${process.env.WORKFLOW_VERSION ?? 'v1'}.ts`),
    activities, maxConcurrentActivityTaskExecutions: 4,
    maxConcurrentWorkflowTaskExecutions: 4,
    shutdownGraceTime: '1s',
  });
  console.log(JSON.stringify({ ready: true, pid: process.pid, version: process.env.WORKFLOW_VERSION ?? 'v1' }));
  await worker.run();
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
