import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '@/common/exceptions/app.exception';
import type { MatrixContactConfig } from '@/config/matrix-contact.config';

export type MatrixWhatsappContactPayload = {
  caseId: string;
  cliente: string;
  nomeCurtoCliente: string;
  contrato: string;
  telefone: string;
};

export type MatrixWhatsappContactResult = {
  provider: 'n8n';
  statusCode: number;
  responseBody: unknown;
};

function parseResponseBody(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

@Injectable()
export class MatrixWhatsappContactService {
  constructor(private readonly configService: ConfigService) {}

  async sendHsm(
    payload: MatrixWhatsappContactPayload,
  ): Promise<MatrixWhatsappContactResult> {
    const config = this.configService.get<MatrixContactConfig>('matrixContact');

    if (!config?.webhookUrl) {
      throw new AppException(
        'Webhook N8N para envio Matrix nao configurado.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
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
      const responseBody = parseResponseBody(await response.text());

      if (!response.ok) {
        throw new AppException(
          'N8N retornou falha ao solicitar envio Matrix.',
          HttpStatus.BAD_GATEWAY,
          {
            details: JSON.stringify({
              statusCode: response.status,
              responseBody,
            }),
          },
        );
      }

      return {
        provider: 'n8n',
        statusCode: response.status,
        responseBody,
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      throw new AppException(
        'Falha ao comunicar com o N8N para envio Matrix.',
        HttpStatus.BAD_GATEWAY,
        {
          cause: error instanceof Error ? error.message : String(error),
        },
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
