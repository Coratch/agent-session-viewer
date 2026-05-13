const { parseArgs } = require('./config');

function main(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  if (config.help) {
    process.stdout.write(commandHelpText(config.command));
    return;
  }

  if (config.command === 'recap') {
    const { writeRecap } = require('./recap');
    writeRecap(config);
    return;
  }

  if (config.command === 'export') {
    const { writeSessionExport } = require('./exporter');
    writeSessionExport(config);
    return;
  }

  const { createServer } = require('./server');
  const server = createServer(config);
  server.listen(config.port, config.host, () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : config.port;
    process.stdout.write(`AgentLens listening on http://${config.host}:${port}\n`);
  });
}

function commandHelpText(command) {
  if (command === 'recap') return recapHelpText();
  if (command === 'export') return exportHelpText();
  return helpText();
}

function helpText() {
  return [
    'Usage: agent-session-viewer [options]',
    '       agent-session-viewer recap [options]',
    '       agent-session-viewer export [options]',
    '',
    'Commands:',
    '  recap                         Generate a local work recap',
    '  export                        Export one session as Markdown',
    '',
    'Options:',
    '  --port, -p <port>              Port to listen on (default: 4500)',
    '  --host <host>                  Host to bind (default: 127.0.0.1)',
    '  --provider <list>              Comma-separated providers: claude-code,codex',
    '  --claude-dir <path>            Claude Code projects root',
    '  --codex-dir <path>             Codex sessions root',
    '  --demo                         Use packaged example sessions',
    '  --help, -h                     Show this help',
    '',
  ].join('\n');
}

function recapHelpText() {
  return [
    'Usage: agent-session-viewer recap [options]',
    '',
    'Options:',
    '  --days <number>                Days to include (default: 7)',
    '  --since <YYYY-MM-DD>           Include sessions updated on or after date',
    '  --project <name>               Filter by project, cwd, or title',
    '  --provider <list>              Comma-separated providers: claude-code,codex',
    '  --format markdown              Output format (default: markdown)',
    '  --redaction <level>            basic, strict, or none (default: basic)',
    '  --out, -o <path>               Write recap to a file instead of stdout',
    '  --demo                         Use packaged example sessions',
    '  --help, -h                     Show this help',
    '',
  ].join('\n');
}

function exportHelpText() {
  return [
    'Usage: agent-session-viewer export [options]',
    '',
    'Options:',
    '  --provider <id>                Session provider: claude-code or codex',
    '  --id <session-id>              Session id to export',
    '  --format markdown              Output format (default: markdown)',
    '  --redaction <level>            basic, strict, or none (default: basic)',
    '  --out, -o <path>               Write export to a file instead of stdout',
    '  --claude-dir <path>            Claude Code projects root',
    '  --codex-dir <path>             Codex sessions root',
    '  --demo                         Use packaged example sessions',
    '  --help, -h                     Show this help',
    '',
  ].join('\n');
}

module.exports = {
  commandHelpText,
  exportHelpText,
  helpText,
  main,
  recapHelpText,
};

if (require.main === module) {
  main(process.argv.slice(2));
}
