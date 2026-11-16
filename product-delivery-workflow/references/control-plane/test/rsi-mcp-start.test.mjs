import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

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
    'rsi_get_context',
    'rsi_get_evidence',
    'rsi_get_manifest'
  ]);
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
