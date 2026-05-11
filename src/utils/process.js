const { execSync } = require('node:child_process');

function listClaudeProcesses() {
  try {
    const out = execSync('ps -ax -o pid=,ppid=,etime=,args=', {
      encoding: 'utf8',
      timeout: 1500,
    });
    return out.split('\n').filter((line) => /(^|\/)claude(\s|$)/.test(line));
  } catch {
    return [];
  }
}

module.exports = {
  listClaudeProcesses,
};
