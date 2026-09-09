import { Injectable, Logger } from '@nestjs/common';
import { getRecoveryNotifierConfig } from '@/config/recovery-notifier.config';
import type { RecoveryWebhookPayload } from '@/modules/erp-sync/recovery-notifications.builder';

/**
 * Entrega as notificacoes de "cliente regularizou" via webhook N8N (mesmo
 * padrao do HSM Matrix). Best-effort: nunca lanca — uma falha de entrega
 * jamais pode reverter a recuperacao ja persistida nem derrubar a sincronizacao.
 * Sem URL configurada, apenas registra em log e ignora.
 */
@Injectable()
export class RecoveryNotifierService {
  private readonly logger = new Logger(RecoveryNotifierService.name);

  async dispatch(payload: RecoveryWebhookPayload): Promise<boolean> {
    const config = getRecoveryNotifierConfig();

    if (!config.webhookUrl) {
      this.logger.debug(
        `N8N_RECOVERY_WEBHOOK_URL nao configurado — ${payload.summary.count} regularizacao(oes) nao enviada(s) ao N8N.`,
      );
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };

      if (config.webhookSecret) {
        headers['X-Webhook-Secret'] = config.webhookSecret;
      }

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.error(
          `N8N retornou ${response.status} ao receber notificacoes de recuperacao.`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        'Falha ao enviar notificacoes de recuperacao ao N8N.',
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
