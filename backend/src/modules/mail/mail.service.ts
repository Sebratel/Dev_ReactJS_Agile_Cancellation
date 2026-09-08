import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getMailConfig, type MailConfig } from '@/modules/mail/mail.config';

export type SendMailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

/**
 * Envio de e-mail transacional. Projetado para ser seguro por padrao: quando
 * MAIL_MODE != 'smtp' (ou o SMTP nao esta configurado), apenas registra em log
 * e nao envia — nunca lanca excecao, para que uma falha de e-mail jamais
 * derrube o fluxo que o disparou (ex.: a sincronizacao do ERP).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly config: MailConfig = getMailConfig();
  private transporter: Transporter | null = null;

  get enabled(): boolean {
    return this.config.mode === 'smtp' && this.config.smtp !== null;
  }

  private getTransporter(): Transporter | null {
    if (!this.config.smtp) {
      return null;
    }

    this.transporter ??= nodemailer.createTransport({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: this.config.smtp.user
        ? { user: this.config.smtp.user, pass: this.config.smtp.password ?? '' }
        : undefined,
    });

    return this.transporter;
  }

  async sendMail(params: SendMailParams): Promise<boolean> {
    const recipients = Array.isArray(params.to) ? params.to : [params.to];
    const validRecipients = recipients
      .map((address) => address.trim())
      .filter((address) => address.length > 0);

    if (validRecipients.length === 0) {
      return false;
    }

    if (!this.enabled) {
      this.logger.debug(
        `E-mail nao enviado (MAIL_MODE desabilitado): "${params.subject}" -> ${validRecipients.join(', ')}`,
      );
      return false;
    }

    const transporter = this.getTransporter();
    const from = this.config.smtp?.from;

    if (!transporter || !from) {
      return false;
    }

    try {
      await transporter.sendMail({
        from,
        to: validRecipients.join(', '),
        subject: params.subject,
        html: params.html,
        text: params.text ?? params.html.replace(/<[^>]+>/g, ' '),
      });
      return true;
    } catch (error) {
      // Nunca propaga — e-mail e best-effort.
      this.logger.error(
        `Falha ao enviar e-mail "${params.subject}".`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
