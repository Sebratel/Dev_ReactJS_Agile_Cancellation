import {
  mockAuditLogs,
  mockCollectionCaseDetails,
  mockCollectionCaseListRecords,
  resetMockCollectionCases,
} from '@/modules/collection-cases/mocks/collection-cases.mock';
import { CollectionCasesMockRepository } from '@/modules/collection-cases/repositories/collection-cases-mock.repository';

describe('CollectionCasesMockRepository - fluxos de status e atribuicao', () => {
  const repository = new CollectionCasesMockRepository();
  const caseId = 'case_0002';

  beforeEach(() => {
    resetMockCollectionCases();
  });

  function details(id = caseId) {
    const found = mockCollectionCaseDetails[id];
    if (!found) throw new Error(`mock ${id} ausente`);
    return found;
  }

  describe('getStatusSummary e getIntakeSummary', () => {
    it('conta os casos por status', async () => {
      const summary = await repository.getStatusSummary();
      const total = Object.values(summary).reduce((acc, n) => acc + n, 0);
      expect(total).toBe(mockCollectionCaseListRecords.length);
    });

    it('conta casos criados hoje e ontem', async () => {
      const now = new Date('2026-06-10T15:00:00.000Z');
      const [first, second, third] = mockCollectionCaseListRecords;
      if (!first || !second || !third) throw new Error('mocks insuficientes');
      first.createdAt = '2026-06-10T10:00:00.000Z';
      second.createdAt = '2026-06-09T10:00:00.000Z';
      third.createdAt = '2020-01-01T10:00:00.000Z';

      const result = await repository.getIntakeSummary(now);

      expect(result.today).toBeGreaterThanOrEqual(1);
      expect(result.yesterday).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getContactContext', () => {
    it('retorna null para caso inexistente', async () => {
      await expect(
        repository.getContactContext('nao_existe'),
      ).resolves.toBeNull();
    });

    it('retorna cliente e contrato do caso', async () => {
      const context = await repository.getContactContext(caseId);
      expect(context?.id).toBe(caseId);
      expect(context?.customer.name).toBe(details().customer.name);
      expect(context?.contract.code).toBe(details().contract.code);
    });
  });

  describe('recordWhatsAppContactIntegration', () => {
    it('registra tentativa e marca aguardando resposta quando concluido', async () => {
      const result = await repository.recordWhatsAppContactIntegration({
        caseId,
        performedByUserId: 'usr_marina',
        status: 'COMPLETED',
        payload: { a: 1 },
        matrixAttendanceCode: 'ATD-1',
        matrixMessageCode: 'MSG-1',
      });

      expect(result.matrixAttendanceCode).toBe('ATD-1');
      expect(result.matrixMessageCode).toBe('MSG-1');
      expect(details().attempts[0]?.notes).toContain('HSM Matrix solicitado');
      expect(details().matrixContact.awaitingReply).toBe(true);
      const record = mockCollectionCaseListRecords.find((r) => r.id === caseId);
      expect(record?.matrixAwaitingReply).toBe(true);
      expect(mockAuditLogs.at(-1)?.action).toBe('INTEGRATION');
    });

    it('registra falha sem marcar aguardando resposta', async () => {
      const result = await repository.recordWhatsAppContactIntegration({
        caseId,
        performedByUserId: null,
        status: 'FAILED',
        payload: {},
        errorMessage: 'timeout',
      });

      expect(result.matrixAttendanceCode).toBeNull();
      expect(details().attempts[0]?.notes).toContain('Falha');
      expect(details().attempts[0]?.notes).toContain('timeout');
      expect(details().matrixContact.awaitingReply).toBe(false);
    });

    it('audita mesmo quando o caso nao existe', async () => {
      const before = mockAuditLogs.length;
      await repository.recordWhatsAppContactIntegration({
        caseId: 'nao_existe',
        performedByUserId: null,
        status: 'COMPLETED',
        payload: {},
      });
      expect(mockAuditLogs).toHaveLength(before + 1);
    });
  });

  describe('sendToCancellation', () => {
    const input = { reason: 'Motivo', assignedUserId: 'usr_cancel' };

    it('retorna case_not_found para caso inexistente', async () => {
      await expect(
        repository.sendToCancellation({
          caseId: 'nao_existe',
          input,
          performedByUserId: null,
        }),
      ).resolves.toEqual({ outcome: 'case_not_found' });
    });

    it('bloqueia status que nao pode ir para cancelamento', async () => {
      details().status = 'CLOSED';
      const result = await repository.sendToCancellation({
        caseId,
        input,
        performedByUserId: null,
      });
      expect(result).toEqual({
        outcome: 'status_not_allowed',
        currentStatus: 'CLOSED',
      });
    });

    it('reatribui o caso ao agente de cancelamento', async () => {
      await repository.sendToCancellation({
        caseId,
        input,
        performedByUserId: 'usr_marina',
      });
      expect(details().assignedTo?.id).toBe('usr_cancel');
      const record = mockCollectionCaseListRecords.find((r) => r.id === caseId);
      expect(record?.assignedUserId).toBe('usr_cancel');
    });
  });

  describe('revertCancellation', () => {
    const input = { reason: 'Cliente pagou', notes: 'ok' };

    it('retorna case_not_found e status_not_allowed', async () => {
      await expect(
        repository.revertCancellation({
          caseId: 'nao_existe',
          input,
          performedByUserId: null,
        }),
      ).resolves.toEqual({ outcome: 'case_not_found' });

      details().status = 'IN_COLLECTION';
      await expect(
        repository.revertCancellation({
          caseId,
          input,
          performedByUserId: null,
        }),
      ).resolves.toEqual({
        outcome: 'status_not_allowed',
        currentStatus: 'IN_COLLECTION',
      });
    });

    it('devolve o caso para cobranca e cancela o processo ativo', async () => {
      await repository.sendToCancellation({
        caseId,
        input: { reason: 'Motivo', assignedUserId: 'usr_cancel' },
        performedByUserId: 'usr_marina',
      });

      const result = await repository.revertCancellation({
        caseId,
        input,
        performedByUserId: 'usr_marina',
      });

      expect(result.outcome).toBe('success');
      expect(details().status).toBe('IN_COLLECTION');
      expect(details().cancellationProcess?.status).toBe('CANCELLED');
      expect(details().cancellationProcess?.completedAt).not.toBeNull();
      expect(mockAuditLogs.at(-1)?.metadata).toEqual(
        expect.objectContaining({ action: 'REVERT_CANCELLATION' }),
      );
    });

    it('atribui ao executor quando o caso estava sem responsavel', async () => {
      details().status = 'ELIGIBLE_FOR_CANCELLATION';
      details().assignedTo = null;

      await repository.revertCancellation({
        caseId,
        input,
        performedByUserId: 'usr_marina',
      });

      expect(details().assignedTo?.id).toBe('usr_marina');
    });
  });

  describe('recoverCancelled', () => {
    it('trata caso inexistente, status invalido e falta de tentativa manual', async () => {
      await expect(
        repository.recoverCancelled({
          caseId: 'nao_existe',
          performedByUserId: null,
        }),
      ).resolves.toEqual({ outcome: 'case_not_found' });

      await expect(
        repository.recoverCancelled({ caseId, performedByUserId: null }),
      ).resolves.toEqual({
        outcome: 'status_not_allowed',
        currentStatus: details().status,
      });

      details().status = 'CLOSED';
      details().attempts = details().attempts.map((a) => ({
        ...a,
        isAutomatic: true,
      }));
      await expect(
        repository.recoverCancelled({ caseId, performedByUserId: null }),
      ).resolves.toEqual({ outcome: 'no_manual_attempt' });
    });

    it('recupera caso fechado com tentativa manual', async () => {
      details().status = 'CLOSED';
      const [first, ...rest] = details().attempts;
      if (!first) throw new Error('mock sem tentativas');
      details().attempts = [{ ...first, isAutomatic: false }, ...rest];

      const result = await repository.recoverCancelled({
        caseId,
        performedByUserId: 'usr_marina',
      });

      expect(result.outcome).toBe('success');
      expect(details().status).toBe('RECOVERED');
      const record = mockCollectionCaseListRecords.find((r) => r.id === caseId);
      expect(record?.status).toBe('RECOVERED');
    });
  });

  describe('assignCase, bulkAssignCases e autoDistributeCases', () => {
    it('retorna case_not_found ao atribuir caso inexistente', async () => {
      await expect(
        repository.assignCase({
          caseId: 'nao_existe',
          assignedUserId: 'usr_1',
          performedByUserId: null,
        }),
      ).resolves.toEqual({ outcome: 'case_not_found' });
    });

    it('atribui e remove a atribuicao do caso', async () => {
      await repository.assignCase({
        caseId,
        assignedUserId: 'usr_marina',
        performedByUserId: 'usr_admin',
      });
      expect(details().assignedTo?.id).toBe('usr_marina');

      await repository.assignCase({
        caseId,
        assignedUserId: null,
        performedByUserId: 'usr_admin',
      });
      expect(details().assignedTo).toBeNull();
      const record = mockCollectionCaseListRecords.find((r) => r.id === caseId);
      expect(record?.assignedUserId).toBeNull();
      expect(mockAuditLogs.at(-1)?.action).toBe('UPDATE');
    });

    it('atribui em lote ignorando ids inexistentes', async () => {
      const result = await repository.bulkAssignCases({
        caseIds: [caseId, 'nao_existe'],
        assignedUserId: 'usr_marina',
        performedByUserId: null,
      });
      expect(result).toEqual({ assigned: 1, skipped: 1 });
      expect(details().assignedTo?.id).toBe('usr_marina');

      await repository.bulkAssignCases({
        caseIds: [caseId],
        assignedUserId: null,
        performedByUserId: null,
      });
      expect(details().assignedTo).toBeNull();
    });

    it('distribuicao automatica nao distribui nada no mock', async () => {
      await expect(repository.autoDistributeCases()).resolves.toEqual({
        distributed: 0,
        agents: 0,
      });
    });
  });
});
