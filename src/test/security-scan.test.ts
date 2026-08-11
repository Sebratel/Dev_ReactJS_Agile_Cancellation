import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(import.meta.dirname, '../..');

type EnvRuleInput = {
  fileName: string;
  exists: boolean;
  isTracked: boolean;
  isIgnored: boolean;
};

function evaluateEnvRule(input: EnvRuleInput) {
  const output = execFileSync(
    'node',
    [
      '--input-type=module',
      '-e',
      `import { getEnvFileViolation } from './scripts/security-scan-env.mjs';
console.log(JSON.stringify(getEnvFileViolation(${JSON.stringify(input)})));`,
    ],
    {
      cwd: projectRoot,
      encoding: 'utf8',
    },
  ).trim();

  return output === 'null' ? null : (JSON.parse(output) as string);
}

describe('security-scan env rules', () => {
  it('permite .env local ignorado e nao versionado', () => {
    expect(
      evaluateEnvRule({
        fileName: '.env',
        exists: true,
        isTracked: false,
        isIgnored: true,
      }),
    ).toBeNull();
  });

  it('bloqueia .env versionado no Git', () => {
    expect(
      evaluateEnvRule({
        fileName: '.env',
        exists: true,
        isTracked: true,
        isIgnored: false,
      }),
    ).toContain('versionado no Git');
  });

  it('bloqueia .env existente fora do gitignore', () => {
    expect(
      evaluateEnvRule({
        fileName: '.env.local',
        exists: true,
        isTracked: false,
        isIgnored: false,
      }),
    ).toContain('nao esta ignorado pelo Git');
  });

  it('executa security:scan com .env local permitido', () => {
    const output = execFileSync('node', ['./scripts/security-scan.mjs'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    expect(output).toContain('Security scan passed.');
  });
});
