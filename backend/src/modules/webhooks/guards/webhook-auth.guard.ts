import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { getWebhookConfig } from '@/config/webhook.config';

export const WEBHOOK_SECRET_HEADER = 'x-webhook-secret';

function safeCompare(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

@Injectable()
export class WebhookAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = getWebhookConfig().n8nSecret;

    if (!expectedSecret) {
      throw new ServiceUnavailableException(
        'Webhook nao configurado. Defina N8N_WEBHOOK_SECRET.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const headerValue = request.headers[WEBHOOK_SECRET_HEADER];
    const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!provided || !safeCompare(provided, expectedSecret)) {
      throw new UnauthorizedException('Segredo de webhook invalido.');
    }

    return true;
  }
}
