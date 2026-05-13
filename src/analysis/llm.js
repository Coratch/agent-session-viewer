const { spawn } = require('node:child_process');

function createClaudePAdapter(options = {}) {
  const runner = options.runner || runCommand;
  const command = options.command || 'claude';
  const timeoutMs = options.timeoutMs || 120000;
  return {
    id: 'claude-p',
    label: 'Claude Code CLI',
    async run({ prompt, schema }) {
      const args = [
        '-p',
        '--output-format',
        'json',
        '--json-schema',
        JSON.stringify(schema || { type: 'object' }),
        '--no-session-persistence',
        '--permission-mode',
        'dontAsk',
        '--tools',
        '',
      ];
      if (options.model) args.push('--model', options.model);
      if (options.maxBudgetUSD !== false) {
        args.push('--max-budget-usd', String(options.maxBudgetUSD ?? 0.25));
      }
      const stdout = await runner(command, args, prompt, { timeoutMs });
      return parseClaudeOutput(stdout);
    },
  };
}

function parseClaudeOutput(stdout) {
  const parsed = JSON.parse(String(stdout || '{}'));
  if (parsed && parsed.structured_output && typeof parsed.structured_output === 'object') {
    return parsed.structured_output;
  }
  if (parsed && typeof parsed.result === 'string') return JSON.parse(parsed.result);
  if (parsed && parsed.result && typeof parsed.result === 'object') return parsed.result;
  return parsed;
}

function runCommand(command, args, input, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const chunks = [];
    const errors = [];
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} timed out after ${options.timeoutMs || 120000}ms`));
    }, options.timeoutMs || 120000);

    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => errors.push(chunk));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(Buffer.concat(chunks).toString('utf8'));
        return;
      }
      reject(new Error(`${command} exited ${code}: ${Buffer.concat(errors).toString('utf8').trim()}`));
    });
    child.stdin.end(input);
  });
}

module.exports = {
  createClaudePAdapter,
  parseClaudeOutput,
};
