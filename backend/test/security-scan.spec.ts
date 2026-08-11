import { execFileSync } from 'node:child_process';
import path from 'node:path';

describe('Security scan', () => {
  it('passa sem violacoes', () => {
    const backendRoot = path.resolve(__dirname, '..');

    const output = execFileSync('node', ['./scripts/security-scan.mjs'], {
      cwd: backendRoot,
      encoding: 'utf8',
    });

    expect(output).toContain('Security scan passed.');
  });
});
