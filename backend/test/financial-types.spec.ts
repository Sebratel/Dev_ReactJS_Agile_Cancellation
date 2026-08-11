import fs from 'node:fs';
import path from 'node:path';

describe('Tipos financeiros no Prisma schema', () => {
  const schemaPath = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  it('nao usa Float ou Double para valores monetarios', () => {
    expect(schema).not.toMatch(/\bFloat\b/);
    expect(schema).not.toMatch(/\bDouble\b/);
  });

  it('usa Decimal para campos financeiros', () => {
    const financialFields = [
      'totalValue',
      'amount',
      'paidAmount',
      'outstandingAmount',
      'promisedAmount',
    ];

    for (const field of financialFields) {
      expect(schema).toMatch(new RegExp(`${field}\\s+Decimal`));
    }
  });

  it('configura precisao Decimal para MySQL', () => {
    expect(schema).toMatch(/@db\.Decimal\(15,\s*2\)/);
  });
});
