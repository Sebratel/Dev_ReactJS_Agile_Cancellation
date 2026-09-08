import { getMailConfig } from '@/modules/mail/mail.config';
import { MailService } from '@/modules/mail/mail.service';

describe('getMailConfig', () => {
  it('fica desabilitado por padrao', () => {
    expect(getMailConfig({})).toEqual({ mode: 'disabled', smtp: null });
  });

  it('cai para desabilitado em modo smtp sem host/from', () => {
    expect(getMailConfig({ MAIL_MODE: 'smtp' })).toEqual({
      mode: 'disabled',
      smtp: null,
    });
  });

  it('habilita smtp quando host e from estao presentes', () => {
    const config = getMailConfig({
      MAIL_MODE: 'smtp',
      SMTP_HOST: 'smtp.sebratel.com.br',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'user',
      SMTP_PASSWORD: 'pass',
      MAIL_FROM: 'GER <no-reply@sebratel.com.br>',
    });

    expect(config.mode).toBe('smtp');
    expect(config.smtp).toMatchObject({
      host: 'smtp.sebratel.com.br',
      port: 465,
      secure: true,
      from: 'GER <no-reply@sebratel.com.br>',
    });
  });
});

describe('MailService (desabilitado)', () => {
  it('nao envia e retorna false quando MAIL_MODE=disabled, sem lancar', async () => {
    const service = new MailService();
    expect(service.enabled).toBe(false);

    await expect(
      service.sendMail({ to: 'a@b.com', subject: 'oi', html: '<p>oi</p>' }),
    ).resolves.toBe(false);
  });

  it('retorna false quando nao ha destinatario valido', async () => {
    const service = new MailService();

    await expect(
      service.sendMail({ to: '  ', subject: 'oi', html: '<p>oi</p>' }),
    ).resolves.toBe(false);
  });
});
