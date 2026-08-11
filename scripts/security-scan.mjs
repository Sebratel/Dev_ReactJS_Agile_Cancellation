import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  getEnvFileViolation,
  SENSITIVE_ENV_FILE_NAMES,
} from './security-scan-env.mjs';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');
const allowedHexFiles = new Set([
  path.normalize(path.join(srcDir, 'design-system', 'tokens.css')),
]);

const violations = [];

function isIgnored(filePath) {
  return (
    filePath.includes(`${path.sep}dist${path.sep}`) ||
    filePath.includes(`${path.sep}coverage${path.sep}`)
  );
}

function walk(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (isIgnored(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    scanFile(fullPath);
  }
}

function pushViolation(filePath, message) {
  violations.push(`${path.relative(rootDir, filePath)}: ${message}`);
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(rootDir, filePath);
  const isTestFile =
    filePath.includes(`${path.sep}test${path.sep}`) ||
    /\.test\./.test(filePath);

  if (
    !allowedHexFiles.has(path.normalize(filePath)) &&
    filePath.startsWith(srcDir) &&
    /#[0-9A-Fa-f]{3,8}\b/.test(content)
  ) {
    pushViolation(filePath, 'HEX hardcoded encontrado em src.');
  }

  if (/\bany\b/.test(content)) {
    pushViolation(filePath, 'Uso de any encontrado.');
  }

  if (/ts-ignore/.test(content)) {
    pushViolation(filePath, 'Uso de ts-ignore encontrado.');
  }

  if (
    !isTestFile &&
    /console\.log\s*\(/.test(content) &&
    !relativePath.startsWith('scripts')
  ) {
    pushViolation(filePath, 'console.log encontrado em codigo de producao.');
  }

  if (
    /(api[_-]?key|token|secret|password)\s*[:=]\s*['"][^'"]+['"]/i.test(content)
  ) {
    pushViolation(filePath, 'Possivel credencial hardcoded encontrada.');
  }
}

function isGitRepository() {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: rootDir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function isTrackedByGit(fileName) {
  if (!isGitRepository()) {
    return false;
  }

  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', fileName], {
      cwd: rootDir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function isIgnoredByGit(fileName) {
  if (isGitRepository()) {
    try {
      execFileSync('git', ['check-ignore', '-q', fileName], {
        cwd: rootDir,
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  }

  return isListedInGitignore(fileName);
}

function isListedInGitignore(fileName) {
  const gitignorePath = path.join(rootDir, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return false;
  }

  const lines = fs
    .readFileSync(gitignorePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  return lines.some((line) => line.replace(/\/$/, '') === fileName);
}

function scanRootEnvFiles() {
  for (const fileName of SENSITIVE_ENV_FILE_NAMES) {
    const fullPath = path.join(rootDir, fileName);
    const violation = getEnvFileViolation({
      fileName,
      exists: fs.existsSync(fullPath),
      isTracked: isTrackedByGit(fileName),
      isIgnored: isIgnoredByGit(fileName),
    });

    if (violation) {
      violations.push(violation);
    }
  }
}

walk(srcDir);
scanFile(path.join(rootDir, 'package.json'));
scanRootEnvFiles();

if (violations.length > 0) {
  process.stderr.write(`${violations.join('\n')}\n`);
  process.exit(1);
}

process.stdout.write('Security scan passed.\n');
