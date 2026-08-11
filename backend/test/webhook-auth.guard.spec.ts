import {
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import {
  WEBHOOK_SECRET_HEADER,
  WebhookAuthGuard,
} from '@/modules/webhooks/guards/webhook-auth.guard';

function contextWithHeader(value?: string | string[]): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: value === undefined ? {} : { [WEBHOOK_SECRET_HEADER]: value },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('WebhookAuthGuard', () => {
  const guard = new WebhookAuthGuard();
  const validSecret = 'test-webhook-secret-1234567890';

  it('permite quando o segredo do header confere', () => {
    expect(guard.canActivate(contextWithHeader(validSecret))).toBe(true);
  });

  it('rejeita quando o segredo está incorreto', () => {
    expect(() => guard.canActivate(contextWithHeader('errado'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita quando o header está ausente', () => {
    expect(() => guard.canActivate(contextWithHeader())).toThrow(
      UnauthorizedException,
    );
  });

  it('retorna 503 quando o segredo não está configurado', () => {
    const original = process.env.N8N_WEBHOOK_SECRET;
    delete process.env.N8N_WEBHOOK_SECRET;

    try {
      expect(() => guard.canActivate(contextWithHeader('qualquer'))).toThrow(
        ServiceUnavailableException,
      );
    } finally {
      process.env.N8N_WEBHOOK_SECRET = original;
    }
  });
});
