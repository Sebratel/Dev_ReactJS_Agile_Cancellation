import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');
const prismaSchemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
const violations = [];

function pushViolation(filePath, message) {
  violations.push(`${path.relative(rootDir, filePath)}: ${message}`);
}

function walk(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    scanFile(fullPath);
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  if (/\bany\b/.test(content)) {
    pushViolation(filePath, 'Uso de any encontrado.');
  }

  if (/ts-ignore/.test(content)) {
    pushViolation(filePath, 'Uso de ts-ignore encontrado.');
  }

  if (
    /console\.log\s*\(/.test(content) &&
    filePath.includes(`${path.sep}src${path.sep}`)
  ) {
    pushViolation(filePath, 'console.log encontrado em src.');
  }

  if (/(password|token)\s*[:=]\s*['"][^'"]+['"]/i.test(content)) {
    pushViolation(filePath, 'Possivel segredo hardcoded encontrado.');
  }

  if (
    /DATABASE_URL\s*=\s*["']mysql:\/\/(?!USER:PASSWORD@HOST)/i.test(content)
  ) {
    pushViolation(filePath, 'DATABASE_URL real detectada.');
  }
}

function isGitTracked(relativePath) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', relativePath], {
      cwd: rootDir,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function scanEnvironmentFiles() {
  const forbiddenTrackedFiles = [
    '.env',
    '.env.local',
    '.env.development.local',
    '.env.production',
    '.env.production.local',
  ];

  for (const fileName of forbiddenTrackedFiles) {
    if (isGitTracked(fileName)) {
      pushViolation(
        path.join(rootDir, fileName),
        'Arquivo .env real nao deve ser versionado.',
      );
    }
  }
}

function scanPrismaSchema() {
  const schema = fs.readFileSync(prismaSchemaPath, 'utf8');

  if (!/provider\s*=\s*"mysql"/.test(schema)) {
    pushViolation(prismaSchemaPath, 'Provider do Prisma deve ser mysql.');
  }

  if (/\b(Float|Double)\b/.test(schema)) {
    pushViolation(
      prismaSchemaPath,
      'Nao use Float ou Double para dinheiro no Prisma.',
    );
  }
}

walk(srcDir);
scanFile(path.join(rootDir, '.env.example'));
scanEnvironmentFiles();
scanPrismaSchema();

if (violations.length > 0) {
  process.stderr.write(`${violations.join('\n')}\n`);
  process.exit(1);
}

process.stdout.write('Security scan passed.\n');
