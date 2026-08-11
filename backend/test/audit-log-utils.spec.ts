import { resolveAuditLogSummary } from '@/modules/audit-logs/utils/audit-log-summary.util';
import { sanitizeAuditMetadata } from '@/modules/audit-logs/utils/audit-log-sanitize.util';

describe('audit-log-summary.util', () => {
  it('resume tentativa de cobranca', () => {
    expect(resolveAuditLogSummary('CREATE', { attemptId: 'att_1' })).toBe(
      'Tentativa de cobranca registrada',
    );
  });

  it('resume promessa criada', () => {
    expect(
      resolveAuditLogSummary('CREATE', {
        resourceType: 'PAYMENT_PROMISE',
        promiseId: 'prm_1',
      }),
    ).toBe('Promessa de pagamento criada');
  });

  it('resume encaminhamento para cancelamento', () => {
    expect(
      resolveAuditLogSummary('STATUS_CHANGE', {
        resourceType: 'CANCELLATION_PROCESS',
        reason: 'Inadimplencia',
      }),
    ).toBe('Caso encaminhado para cancelamento');
  });

  it('usa fallback da action', () => {
    expect(resolveAuditLogSummary('EXPORT', null)).toBe('Exportacao realizada');
  });
});

describe('audit-log-sanitize.util', () => {
  it('remove campos sensiveis', () => {
    expect(
      sanitizeAuditMetadata({
        attemptId: 'att_1',
        passwordHash: 'secret',
        refreshTokenHash: 'secret',
        accessToken: 'token',
      }),
    ).toEqual({ attemptId: 'att_1' });
  });
});
