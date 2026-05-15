const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('package declares React Vite TypeScript web stack', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.equal(pkg.scripts['web:dev'], 'vite --config web/vite.config.ts');
  assert.equal(pkg.scripts['web:build'], 'vite build --config web/vite.config.ts');
  assert.equal(pkg.scripts['web:check'], 'tsc -p web/tsconfig.json --noEmit');
  assert.match(pkg.check || pkg.scripts.check, /web:check/);
  assert.match(pkg.files.join('\n'), /web\/dist\//);

  for (const name of [
    '@vitejs/plugin-react',
    '@tanstack/react-virtual',
    '@types/react',
    '@types/react-dom',
    'react',
    'react-dom',
    'typescript',
    'vite',
  ]) {
    assert.ok(pkg.devDependencies?.[name], `${name} should be a web build dependency`);
  }
});

test('React Vite source files exist', () => {
  const app = fs.readFileSync(path.join(root, 'web', 'src', 'App.tsx'), 'utf8');

  assert.match(fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8'), /id="root"/);
  assert.match(fs.readFileSync(path.join(root, 'web', 'vite.config.ts'), 'utf8'), /@vitejs\/plugin-react/);
  assert.match(fs.readFileSync(path.join(root, 'web', 'tsconfig.json'), 'utf8'), /react-jsx/);
  assert.match(fs.readFileSync(path.join(root, 'web', 'src', 'main.tsx'), 'utf8'), /createRoot/);
  assert.match(app, /useVirtualizer/);
});

test('React source preserves production workflows from the classic UI', () => {
  const app = fs.readFileSync(path.join(root, 'web', 'src', 'App.tsx'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'web', 'src', 'styles.css'), 'utf8');

  for (const pattern of [
    /LANGUAGES/,
    /setLanguage/,
    /loadAnalysisTemplates/,
    /runAnalysis/,
    /analysisToMarkdown/,
    /copyAnalysisMarkdown/,
    /\/api\/analysis\/templates/,
    /\/api\/session\/analyze/,
    /runRecap/,
    /renderRecapSections/,
    /copyRecapMarkdown/,
    /\/api\/recap/,
  ]) {
    assert.match(app, pattern);
  }

  for (const pattern of [
    /\.analysis-panel/,
    /\.recap-view/,
    /\.context-tags/,
    /\.language-switcher/,
  ]) {
    assert.match(styles, pattern);
  }
});

test('React source includes ToC responsive shell and focused empty state', () => {
  const app = fs.readFileSync(path.join(root, 'web', 'src', 'App.tsx'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'web', 'src', 'styles.css'), 'utf8');

  for (const pattern of [
    /mobilePane/,
    /setMobilePane/,
    /mobile-pane-tabs/,
    /empty-actions/,
    /openLatestSession/,
    /showRecapAction/,
  ]) {
    assert.match(app, pattern);
  }

  for (const pattern of [
    /@media \(max-width: 720px\)/,
    /\.mobile-pane-tabs/,
    /\.app-shell\.mobile-pane-sessions/,
    /\.app-shell\.mobile-pane-session/,
    /\.app-shell\.mobile-pane-inspector/,
    /\.inspector-pane[\s\S]*overflow-x: hidden/,
    /\.tag[\s\S]*white-space: normal/,
  ]) {
    assert.match(styles, pattern);
  }
});

test('React source includes ToC control consolidation and inspector information architecture', () => {
  const app = fs.readFileSync(path.join(root, 'web', 'src', 'App.tsx'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'web', 'src', 'styles.css'), 'utf8');

  assert.doesNotMatch(app, /<select\b/);

  for (const pattern of [
    /CustomSelect/,
    /settings-popover/,
    /workspace-settings/,
    /settingsOpen/,
    /providerOptions/,
    /languageOptions/,
    /inspectorTab/,
    /inspector-tabs/,
    /detail-list/,
    /copySessionId/,
  ]) {
    assert.match(app, pattern);
  }

  for (const pattern of [
    /\.topbar-actions[\s\S]*grid-template-columns: 132px 42px/,
    /\.custom-select/,
    /\.custom-select-menu/,
    /\.settings-popover/,
    /\.workspace-settings/,
    /\.inspector-pane[\s\S]*grid-template-rows: auto;/,
    /\.inspector-tabs/,
    /\.detail-list/,
    /\.session-id-value/,
  ]) {
    assert.match(styles, pattern);
  }
});

test('React source includes ToC delivery polish for responsive actions and states', () => {
  const app = fs.readFileSync(path.join(root, 'web', 'src', 'App.tsx'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'web', 'src', 'styles.css'), 'utf8');

  for (const pattern of [
    /empty-action-grid/,
    /empty-action-card/,
    /status-strip/,
    /inspector-empty/,
    /session-loading/,
    /aria-label=\{t\('searchSessions'\)\}/,
    /aria-label=\{t\('resumeWork'\)\}/,
    /settingsLabel/,
  ]) {
    assert.match(app, pattern);
  }

  for (const pattern of [
    /\.topbar-actions[\s\S]*grid-template-columns: 132px 42px/,
    /@media \(max-width: 1180px\)[\s\S]*\.topbar-actions[\s\S]*display: grid/,
    /@media \(max-width: 720px\)[\s\S]*\.topbar-actions[\s\S]*grid-template-columns: minmax\(60px, 72px\) 40px/,
    /\.mobile-pane-tabs[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
    /\.mobile-pane-tabs[\s\S]*gap: 6px/,
    /\.primary-action:hover/,
    /:focus-visible/,
    /\.empty-visual/,
    /\.app-shell\.is-home/,
    /\.empty-action-card/,
    /\.status-strip/,
    /\.inspector-empty/,
    /\.session-loading/,
  ]) {
    assert.match(styles, pattern);
  }
});

test('React source keeps selected and result states visually consumer-grade', () => {
  const app = fs.readFileSync(path.join(root, 'web', 'src', 'App.tsx'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'web', 'src', 'styles.css'), 'utf8');

  for (const pattern of [
    /activeView === 'recap' \? 'is-recap'/,
    /turn-kind-\$\{turn\.kind\}/,
    /searchTab:/,
    /analysisTab:/,
    /tab === 'search' \? t\('searchTab'\)/,
  ]) {
    assert.match(app, pattern);
  }

  for (const pattern of [
    /\.app-shell\.is-recap/,
    /\.app-shell\.is-recap \.inspector-pane[\s\S]*display: none/,
    /\.session-header h2[\s\S]*-webkit-line-clamp: 2/,
    /\.turn-kind-tool_call/,
    /\.turn-kind-tool_result/,
    /\.analysis-actions button:first-child[\s\S]*grid-column: 1 \/ -1/,
  ]) {
    assert.match(styles, pattern);
  }
});

test('React source enforces quiet shipped-product workspace and measured messages', () => {
  const app = fs.readFileSync(path.join(root, 'web', 'src', 'App.tsx'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'web', 'src', 'styles.css'), 'utf8');

  for (const pattern of [
    /measureElement:/,
    /ref=\{rowVirtualizer\.measureElement\}/,
    /data-index=\{virtualItem\.index\}/,
    /className="turn-list-spacer"/,
    /className="turn-list-canvas"/,
  ]) {
    assert.match(app, pattern);
  }

  assert.doesNotMatch(styles, /radial-gradient/);
  assert.doesNotMatch(styles, /backdrop-filter/);

  for (const pattern of [
    /--space-6: 24px/,
    /--content-max: 780px/,
    /--sidebar-width: 284px/,
    /--inspector-width: 360px/,
    /\.app-shell[\s\S]*gap: 0;/,
    /\.sessions-pane,[\s\S]*\.inspector-pane[\s\S]*box-shadow: none/,
    /\.turn-list-canvas/,
    /\.turn-row[\s\S]*width: min\(100%, var\(--content-max\)\)/,
    /\.turn-row \+ \.turn-row[\s\S]*margin-top: var\(--space-5\)/,
    /\.turn-row p[\s\S]*white-space: pre-wrap/,
    /\.turn-kind-tool_call,[\s\S]*\.turn-kind-tool_result[\s\S]*background: transparent/,
  ]) {
    assert.match(styles, pattern);
  }
});

test('React source enforces production-grade integrated workspace rhythm', () => {
  const styles = fs.readFileSync(path.join(root, 'web', 'src', 'styles.css'), 'utf8');

  assert.doesNotMatch(styles, /linear-gradient/);
  assert.doesNotMatch(styles, /box-shadow: 0 (?:1[6-9]|[2-9]\d)px/);

  for (const pattern of [
    /body[\s\S]*background: var\(--bg\)/,
    /\.app-shell[\s\S]*padding: 0;/,
    /\.topbar[\s\S]*border-bottom: 1px solid var\(--line-soft\)/,
    /\.sessions-pane,[\s\S]*\.inspector-pane[\s\S]*border-radius: 0/,
    /\.sessions-pane,[\s\S]*\.inspector-pane[\s\S]*background: transparent/,
    /\.session-pane[\s\S]*border: 0;/,
    /\.session-pane[\s\S]*border-radius: 0;/,
    /\.session-pane[\s\S]*box-shadow: none;/,
    /\.session-row[\s\S]*border-radius: 8px/,
    /\.turn-row[\s\S]*border: 0;/,
    /\.turn-row[\s\S]*border-top: 1px solid var\(--line-soft\)/,
    /\.turn-row[\s\S]*background: transparent/,
    /\.metric-grid div[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/,
    /\.metric-grid div[\s\S]*border-bottom: 1px solid var\(--line-soft\)/,
    /\.metric-grid div[\s\S]*background: transparent/,
  ]) {
    assert.match(styles, pattern);
  }
});

test('React details panel uses curated unique fields and quiet technical identifiers', () => {
  const app = fs.readFileSync(path.join(root, 'web', 'src', 'App.tsx'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'web', 'src', 'styles.css'), 'utf8');

  assert.doesNotMatch(app, /Object\.entries\(session(?:\.meta)? \|\| \{\}\)/);
  assert.doesNotMatch(app, /sessionContext/);
  assert.match(app, /if \(providerFilter !== 'all'\) params\.set\('provider', providerFilter\)/);

  for (const pattern of [
    /detailOverview/,
    /detailUsage/,
    /detailActions/,
    /copySessionId/,
    /exportSession/,
    /Session ID/,
    /Source/,
    /Created/,
    /Updated/,
    /Copy Session ID/,
  ]) {
    assert.match(app, pattern);
  }

  for (const pattern of [
    /\.detail-section/,
    /\.detail-list/,
    /\.detail-actions/,
    /\.session-id-value[\s\S]*color: var\(--faint\)/,
    /\.session-id-value[\s\S]*font-size: 11px/,
  ]) {
    assert.match(styles, pattern);
  }
});
