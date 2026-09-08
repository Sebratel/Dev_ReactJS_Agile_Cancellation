export type MailMode = 'disabled' | 'smtp';

export type MailSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  password: string | null;
  from: string;
};

export type MailConfig = {
  mode: MailMode;
  smtp: MailSmtpConfig | null;
};

function toBool(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

/**
 * Modo de e-mail: 'disabled' (padrao — apenas registra em log e nao envia) ou
 * 'smtp' (envia via nodemailer). Em 'smtp' sem host/from validos, cai para
 * desabilitado para nunca quebrar um fluxo por falta de configuracao.
 */
export function getMailConfig(env: NodeJS.ProcessEnv = process.env): MailConfig {
  const mode: MailMode = env.MAIL_MODE?.trim() === 'smtp' ? 'smtp' : 'disabled';

  if (mode !== 'smtp') {
    return { mode: 'disabled', smtp: null };
  }

  const host = env.SMTP_HOST?.trim();
  const from = env.MAIL_FROM?.trim();

  if (!host || !from) {
    return { mode: 'disabled', smtp: null };
  }

  return {
    mode: 'smtp',
    smtp: {
      host,
      port: Number(env.SMTP_PORT ?? '587'),
      secure: toBool(env.SMTP_SECURE),
      user: env.SMTP_USER?.trim() || null,
      password: env.SMTP_PASSWORD ?? null,
      from,
    },
  };
}
