import { RecoveryNotifierService } from '@/modules/erp-sync/recovery-notifier.service';
import type { RecoveryWebhookPayload } from '@/modules/erp-sync/recovery-notifications.builder';

function payload(): RecoveryWebhookPayload {
  return {
    event: 'cases.recovered',
    occurredAt: '2026-09-09T12:00:00.000Z',
    summary: { count: 1, totalAmount: 1500 },
    supervisorEmails: ['sup@ger.local'],
    cases: [
      {
        caseId: 'case_1',
        customerName: 'Construtora Horizonte',
        recoveredAmount: 1500,
        hadActivePromise: false,
        agent: { name: 'Marina', email: 'marina@ger.local' },
      },
    ],
  };
}

describe('RecoveryNotifierService', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.N8N_RECOVERY_WEBHOOK_URL;
    delete process.env.N8N_RECOVERY_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  it('nao envia (no-op) quando a URL do webhook nao esta configurada', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const service = new RecoveryNotifierService();

    const result = await service.dispatch(payload());

    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('faz POST no webhook com segredo e corpo JSON quando configurado', async () => {
    process.env.N8N_RECOVERY_WEBHOOK_URL = 'https://n8n.local/webhook/recovery';
    process.env.N8N_RECOVERY_WEBHOOK_SECRET = 'segredo';

    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const service = new RecoveryNotifierService();
    const result = await service.dispatch(payload());

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://n8n.local/webhook/recovery');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['X-Webhook-Secret']).toBe(
      'segredo',
    );
    expect(JSON.parse(init.body as string)).toMatchObject({
      event: 'cases.recovered',
      summary: { count: 1 },
    });
  });

  it('retorna false sem lancar quando o N8N responde erro', async () => {
    process.env.N8N_RECOVERY_WEBHOOK_URL = 'https://n8n.local/webhook/recovery';
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('erro', { status: 500 }));

    const service = new RecoveryNotifierService();
    await expect(service.dispatch(payload())).resolves.toBe(false);
  });

  it('retorna false sem lancar quando o fetch falha', async () => {
    process.env.N8N_RECOVERY_WEBHOOK_URL = 'https://n8n.local/webhook/recovery';
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));

    const service = new RecoveryNotifierService();
    await expect(service.dispatch(payload())).resolves.toBe(false);
  });
});
