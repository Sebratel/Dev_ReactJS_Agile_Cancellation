import { ErpSyncService } from '@/modules/erp-sync/erp-sync.service';

type Internals = {
  logger: { warn: jest.Mock; error: jest.Mock };
  getRenegotiationHistory: jest.Mock;
};

function createService(history: jest.Mock) {
  const service = Object.create(ErpSyncService.prototype) as ErpSyncService;
  const internals = service as unknown as Internals;
  internals.logger = { warn: jest.fn(), error: jest.fn() };
  internals.getRenegotiationHistory = history;

  return service;
}

describe('ErpSyncService.getRenegotiationSummary (card Renegociados em aberto)', () => {
  it('usa a fonte da aba Renegociados (38 em aberto, R$ 5.416,01) e cacheia', async () => {
    const history = jest.fn().mockResolvedValue({
      items: [],
      summary: {
        currentlyRenegotiated: 38,
        openRenegotiationTotal: '5416.01',
      },
    });
    const service = createService(history);

    const first = await service.getRenegotiationSummary();
    const second = await service.getRenegotiationSummary();

    expect(first).toEqual({
      available: true,
      count: 38,
      openAmount: '5416.01',
    });
    expect(second).toEqual(first);
    expect(history).toHaveBeenCalledTimes(1);
    expect(history).toHaveBeenCalledWith({ strict: true });
  });

  it('ERP indisponivel => available=false (nunca 0 falso)', async () => {
    const service = createService(
      jest.fn().mockRejectedValue(new Error('ERP fora do ar')),
    );

    await expect(service.getRenegotiationSummary()).resolves.toEqual({
      available: false,
      count: 0,
      openAmount: '0.00',
    });
  });
});
