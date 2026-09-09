import { DashboardService } from '@/modules/dashboard/dashboard.service';
import type {
  DashboardRepository,
  RecoveryRankingParams,
} from '@/modules/dashboard/repositories/dashboard.repository';
import {
  mockDashboardOperations,
  mockDashboardSummary,
} from '@/modules/dashboard/mocks/dashboard.mock';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';

const supervisorUser: AuthenticatedUser = {
  id: 'supervisor-1',
  email: 'supervisor@ger.local',
  name: 'Supervisor',
  avatarUrl: null,
  roles: ['SUPERVISOR'],
};

const collectionAgentUser: AuthenticatedUser = {
  id: 'agent-1',
  email: 'agent@ger.local',
  name: 'Agente',
  avatarUrl: null,
  roles: ['COLLECTION_AGENT'],
};

describe('DashboardService', () => {
  it('usa contrato de repository', async () => {
    const getSummary = jest.fn().mockResolvedValue(mockDashboardSummary);
    const getOperations = jest.fn().mockResolvedValue(mockDashboardOperations);
    const getRecoveryRanking = jest.fn();
    const repository: DashboardRepository = {
      getSummary,
      getOperations,
      getRecoveryRanking,
    };

    const service = new DashboardService(repository);
    const response = await service.getSummary(supervisorUser);

    expect(getSummary).toHaveBeenCalledWith(undefined);
    expect(response.data.metrics.delinquentCustomers).toBe(128);
    expect(response.timestamp).toEqual(expect.any(String));
  });

  it('filtra resumo pela carteira do atendente', async () => {
    const getSummary = jest.fn().mockResolvedValue(mockDashboardSummary);
    const getOperations = jest.fn();
    const getRecoveryRanking = jest.fn();
    const repository: DashboardRepository = {
      getSummary,
      getOperations,
      getRecoveryRanking,
    };

    const service = new DashboardService(repository);
    await service.getSummary(collectionAgentUser);

    expect(getSummary).toHaveBeenCalledWith({
      assignedUserId: collectionAgentUser.id,
    });
  });

  it('retorna operacoes via repository', async () => {
    const getSummary = jest.fn().mockResolvedValue(mockDashboardSummary);
    const getOperations = jest.fn().mockResolvedValue(mockDashboardOperations);
    const getRecoveryRanking = jest.fn();
    const repository: DashboardRepository = {
      getSummary,
      getOperations,
      getRecoveryRanking,
    };

    const service = new DashboardService(repository);
    const response = await service.getOperations();

    expect(getOperations).toHaveBeenCalledTimes(1);
    expect(response.data.collection.activeCases).toBe(186);
    expect(response.data.cancellations.mostBlockedStep.stepCode).toBe(
      'OPEN_ELEVEN_REQUEST',
    );
    expect(response.timestamp).toEqual(expect.any(String));
  });

  it('resolve o periodo e delega o ranking ao repository', async () => {
    const rankingResponse = {
      periodFrom: '2026-07-01T00:00:00.000Z',
      periodTo: '2026-08-01T00:00:00.000Z',
      totalRecoveredAmount: '100.00',
      totalRecoveredCases: 3,
      ranking: [],
    };
    const getSummary = jest.fn();
    const getOperations = jest.fn();
    const getRecoveryRanking = jest
      .fn<Promise<typeof rankingResponse>, [RecoveryRankingParams]>()
      .mockResolvedValue(rankingResponse);
    const repository: DashboardRepository = {
      getSummary,
      getOperations,
      getRecoveryRanking,
    };

    const service = new DashboardService(repository);
    const response = await service.getRecoveryRanking('current_month');

    expect(getRecoveryRanking).toHaveBeenCalledTimes(1);
    const passedRange = getRecoveryRanking.mock.calls[0]?.[0];
    if (!passedRange) {
      throw new Error('getRecoveryRanking nao recebeu parametros.');
    }
    expect(passedRange.from).toBeInstanceOf(Date);
    expect(passedRange.to).toBeInstanceOf(Date);
    expect(passedRange.from.getTime()).toBeLessThan(passedRange.to.getTime());
    expect(response.data.totalRecoveredCases).toBe(3);
  });
});
