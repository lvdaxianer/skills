import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { RsiContextBuilder } from '../src/rsi-context.mjs';

const controlPlaneRoot = fileURLToPath(new URL('..', import.meta.url));

test('独立 MCP 进程可通过 stdio 初始化并发现 RSI 工具', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rsi-mcp-start-'));
  const projectRoot = join(root, 'project');
  const sharedKnowledgeRoot = join(root, 'shared');
  const result = await runMcpProcess([
    'src/mcp-start.mjs',
    '--projectRoot', projectRoot,
    '--sharedKnowledgeRoot', sharedKnowledgeRoot
  ], [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }
  ]);

  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.responses[0].result.serverInfo.name, 'product-delivery-workflow-rsi');
  assert.deepEqual(result.responses[1].result.tools.map((tool) => tool.name), [
    'rsi_get_context', 'rsi_get_evidence', 'rsi_get_manifest',
    'rsi_report_usage', 'rsi_finalize_run'
  ]);
});

test('独立 MCP 进程可以接收使用回报并完成运行结算', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rsi-mcp-report-'));
  const projectRoot = join(root, 'project');
  const sharedKnowledgeRoot = join(root, 'shared');
  await Promise.all([mkdir(projectRoot), mkdir(sharedKnowledgeRoot)]);
  const builder = new RsiContextBuilder({
    projectRoot,
    sharedKnowledgeRoot,
    globalCatalog: { async listProblems() { return []; } },
    knowledgeStore: { async listKnowledge() { return []; } }
  });
  const snapshot = await builder.build({ projectId: 'demo-project', runId: 'RUN-MCP-002', task: '进程回传' });
  const result = await runMcpProcess([
    'src/mcp-start.mjs', '--projectRoot', projectRoot,
    '--sharedKnowledgeRoot', sharedKnowledgeRoot, '--snapshotId', snapshot.snapshotId
  ], [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: {
      name: 'rsi_report_usage', arguments: {
        runId: snapshot.runId, workerId: 'worker-process', snapshotId: snapshot.snapshotId,
        usages: [{ itemId: 'CURRENT-TASK', stage: 'consulted' }]
      }
    } },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: {
      name: 'rsi_finalize_run', arguments: {
        runId: snapshot.runId, workerId: 'worker-process', snapshotId: snapshot.snapshotId
      }
    } }
  ]);

  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.responses[1].result.isError, false);
  assert.equal(result.responses[2].result.isError, false);
  await rm(root, { recursive: true, force: true });
});

function runMcpProcess(args, messages) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: controlPlaneRoot });
    const responses = [];
    let stdout = '';
    let stderr = '';
    let endedInput = false;
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`MCP 进程超时，stdout=${stdout} stderr=${stderr}`));
    }, 3000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      const lines = stdout.split('\n');
      stdout = lines.pop();
      for (const line of lines.filter(Boolean)) responses.push(JSON.parse(line));
      if (!endedInput && responses.length === messages.length) {
        endedInput = true;
        child.stdin.end();
      }
    });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (exitCode) => {
      clearTimeout(timeout);
      if (exitCode !== 0) {
        reject(new Error(`MCP 进程退出码为 ${exitCode}，stdout=${stdout} stderr=${stderr}`));
        return;
      }
      resolve({ exitCode, stderr, responses });
    });
    for (const message of messages) child.stdin.write(`${JSON.stringify(message)}\n`);
  });
}
