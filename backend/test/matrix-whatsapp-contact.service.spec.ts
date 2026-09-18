import { ConfigService } from '@nestjs/config';
import { MatrixWhatsappContactService } from '@/modules/collection-cases/services/matrix-whatsapp-contact.service';

function createService() {
  const configService = {
    get: () => ({
      webhookUrl: 'https://n8n.local/webhook/matrix-hsm-cobranca',
      webhookSecret: null,
      timeoutMs: 5000,
    }),
  } as unknown as ConfigService;

  return new MatrixWhatsappContactService(configService);
}

const payload = {
  caseId: 'case_1',
  cliente: 'Cliente Teste',
  nomeCurtoCliente: 'Cliente',
  contrato: 'CTR-1',
  telefone: '5551999999999',
};

describe('MatrixWhatsappContactService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('propaga a mensagem legível da Matrix quando o n8n responde falha', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () =>
        JSON.stringify({
          success: false,
          provider: 'matrix',
          message: 'Contato possui atendimento ativo',
          codError: 13,
          statusCode: 400,
        }),
    }) as unknown as typeof fetch;

    const service = createService();

    await expect(service.sendHsm(payload)).rejects.toMatchObject({
      message: expect.stringContaining('Contato possui atendimento ativo'),
    });
  });

  it('usa mensagem genérica quando o n8n não envia message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => JSON.stringify({ success: false }),
    }) as unknown as typeof fetch;

    const service = createService();

    await expect(service.sendHsm(payload)).rejects.toMatchObject({
      message: 'N8N retornou falha ao solicitar envio Matrix.',
    });
  });

  it('retorna resultado e códigos no sucesso', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          matrixResponse: { cod_atendimento: 55, cod_mensagem: 77 },
        }),
    }) as unknown as typeof fetch;

    const service = createService();
    const result = await service.sendHsm(payload);

    expect(result.provider).toBe('n8n');
    expect(result.statusCode).toBe(200);
    expect(result.codAtendimento).toBe('55');
    expect(result.codMensagem).toBe('77');
  });
});
