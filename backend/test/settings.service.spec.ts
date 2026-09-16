import { SettingsService } from '@/modules/settings/settings.service';
import { SettingsMockRepository } from '@/modules/settings/repositories/settings-mock.repository';

function createService() {
  const repository = new SettingsMockRepository();
  return { service: new SettingsService(repository), repository };
}

describe('SettingsService', () => {
  it('retorna os valores padrão quando nada foi persistido', async () => {
    const { service } = createService();

    const settings = await service.getSettings();

    expect(settings).toEqual({ allowAgentSendToCancellation: false });
  });

  it('persiste e reflete a chave allowAgentSendToCancellation', async () => {
    const { service } = createService();

    const updated = await service.updateSettings({
      allowAgentSendToCancellation: true,
    });

    expect(updated.allowAgentSendToCancellation).toBe(true);
    expect(await service.isAgentSendToCancellationAllowed()).toBe(true);
  });

  it('ignora campos ausentes no update (não zera o que não veio)', async () => {
    const { service } = createService();

    await service.updateSettings({ allowAgentSendToCancellation: true });
    const settings = await service.updateSettings({});

    expect(settings.allowAgentSendToCancellation).toBe(true);
  });
});
