const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skippedDirs = new Set(['.git', '.idea', 'node_modules', 'coverage']);
const skippedExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tgz', '.zip']);
const localTermsFile = path.join(root, '.sensitive-terms');
const sensitiveTerms = loadSensitiveTerms();

const tokenPatterns = [
  new RegExp(`\\b${'npm'}_[A-Za-z0-9]{20,}\\b`, 'g'),
  new RegExp(`\\b${'sk'}-[A-Za-z0-9_-]{20,}\\b`, 'g'),
  new RegExp(`\\b${'github'}_${'pat'}_[A-Za-z0-9_]{20,}\\b`, 'g'),
  new RegExp(`\\b${'gh'}[opusr]_[A-Za-z0-9_]{20,}\\b`, 'g'),
];

const homePathPattern = new RegExp(`/${'Users'}/[^\\s"'` + '`' + `]+`, 'g');

function loadSensitiveTerms() {
  const terms = [];
  if (process.env.ASV_SENSITIVE_TERMS) {
    terms.push(...process.env.ASV_SENSITIVE_TERMS.split(','));
  }

  if (fs.existsSync(localTermsFile)) {
    terms.push(...fs.readFileSync(localTermsFile, 'utf8').split(/\r?\n/));
  }

  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))];
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) walk(path.join(dir, entry.name), files);
      continue;
    }

    if (!entry.isFile()) continue;
    const filePath = path.join(dir, entry.name);
    if (skippedExtensions.has(path.extname(filePath).toLowerCase())) continue;
    files.push(filePath);
  }

  return files;
}

function scanFile(filePath) {
  const relativePath = path.relative(root, filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  const findings = [];

  for (const pattern of tokenPatterns) {
    if (pattern.test(text)) findings.push('token-like value');
    pattern.lastIndex = 0;
  }

  if (homePathPattern.test(text)) findings.push('absolute home path');
  homePathPattern.lastIndex = 0;

  for (const term of sensitiveTerms) {
    if (text.toLowerCase().includes(term.toLowerCase())) findings.push('configured sensitive term');
  }

  return findings.map((finding) => `${relativePath}: ${finding}`);
}

const findings = walk(root).flatMap(scanFile);
if (findings.length > 0) {
  console.error('Sensitive information scan failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('Sensitive information scan passed.');
