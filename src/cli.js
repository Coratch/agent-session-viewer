const { parseArgs } = require('./config');

function main(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  if (config.help) {
    process.stdout.write(helpText());
    return;
  }

  const { createServer } = require('./server');
  const server = createServer(config);
  server.listen(config.port, config.host, () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : config.port;
    process.stdout.write(`agent-session-viewer listening on http://${config.host}:${port}\n`);
  });
}

function helpText() {
  return [
    'Usage: agent-session-viewer [options]',
    '',
    'Options:',
    '  --port, -p <port>              Port to listen on (default: 4500)',
    '  --host <host>                  Host to bind (default: 127.0.0.1)',
    '  --provider <list>              Comma-separated providers: claude-code,codex',
    '  --claude-dir <path>            Claude Code projects root',
    '  --codex-dir <path>             Codex sessions root',
    '  --help, -h                     Show this help',
    '',
  ].join('\n');
}

module.exports = {
  helpText,
  main,
};
