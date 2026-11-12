/* eslint-disable @typescript-eslint/no-unsafe-assignment -- matchers do jest (expect.*) retornam any */
import {
  BadRequestException,
  HttpStatus,
  type ArgumentsHost,
  type CallHandler,
  type ExecutionContext,
  RequestTimeoutException,
} from '@nestjs/common';
import { Prisma, type PaymentPromise } from '@prisma/client';
import { lastValueFrom, NEVER, of, throwError } from 'rxjs';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { TimeoutInterceptor } from '@/common/interceptors/timeout.interceptor';
import { getJwtConfig } from '@/config/jwt.config';
import { getHsmDeliveryDbConfig } from '@/config/hsm-delivery-db.config';
import {
  buildPaymentPromiseStatusUpdateData,
  mergePaymentPromiseNotes,
  resolvePaymentPromiseTargetStatus,
} from '@/modules/collection-cases/utils/payment-promise-status.utils';
import { mapPaymentPromiseToResponse } from '@/modules/collection-cases/utils/payment-promise.mapper';
import {
  canRevertCancellation,
  isReversibleCancellationProcess,
} from '@/modules/collection-cases/utils/revert-cancellation.utils';

describe('HttpExceptionFilter', () => {
  function buildHost() {
    const json = jest.fn<void, [unknown]>();
    const status = jest.fn<{ json: typeof json }, [number]>(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/teste' }),
      }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
  }

  it('preserva status e corpo de HttpException', () => {
    const { host, status, json } = buildHost();
    new HttpExceptionFilter().catch(new BadRequestException('invalido'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/api/teste',
        error: expect.objectContaining({ message: 'invalido' }),
      }),
    );
  });

  it('responde 500 generico para erros desconhecidos sem vazar detalhes', () => {
    const { host, status, json } = buildHost();
    new HttpExceptionFilter().catch(new Error('segredo interno'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = json.mock.calls[0]?.[0] as { error: { message: string } };
    expect(body.error).toEqual({ message: 'Internal server error' });
    expect(JSON.stringify(body)).not.toContain('segredo interno');
  });
});

describe('TimeoutInterceptor', () => {
  const context = {} as ExecutionContext;
  const interceptor = new TimeoutInterceptor();

  it('repassa o valor quando o handler responde a tempo', async () => {
    const handler: CallHandler = { handle: () => of('ok') };
    await expect(
      lastValueFrom(interceptor.intercept(context, handler)),
    ).resolves.toBe('ok');
  });

  it('repassa erros comuns sem converter', async () => {
    const erro = new Error('falhou');
    const handler: CallHandler = { handle: () => throwError(() => erro) };
    await expect(
      lastValueFrom(interceptor.intercept(context, handler)),
    ).rejects.toBe(erro);
  });

  it('converte TimeoutError em RequestTimeoutException', async () => {
    jest.useFakeTimers();
    try {
      const handler: CallHandler = { handle: () => NEVER };
      const promise = lastValueFrom(interceptor.intercept(context, handler));
      const assertion = expect(promise).rejects.toBeInstanceOf(
        RequestTimeoutException,
      );
      await jest.advanceTimersByTimeAsync(10_001);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('getJwtConfig', () => {
  it('usa defaults em desenvolvimento sem segredo', () => {
    const config = getJwtConfig({ NODE_ENV: 'development' });
    expect(config.secret).toBe('ger-dev-jwt-secret-local-only');
    expect(config.accessExpiresIn).toBe('15m');
    expect(config.refreshExpiresIn).toBe('7d');
  });

  it('le expiracoes das variaveis, com fallback para JWT_EXPIRES_IN', () => {
    const config = getJwtConfig({
      JWT_SECRET: 'abc',
      JWT_EXPIRES_IN: '30m',
      JWT_REFRESH_EXPIRES_IN: '1d',
    });
    expect(config).toEqual({
      secret: 'abc',
      accessExpiresIn: '30m',
      refreshExpiresIn: '1d',
    });
    expect(
      getJwtConfig({ JWT_SECRET: 'abc', JWT_ACCESS_EXPIRES_IN: '5m' })
        .accessExpiresIn,
    ).toBe('5m');
  });

  it('exige segredo em producao', () => {
    expect(() => getJwtConfig({ NODE_ENV: 'production' })).toThrow(
      /nao configurado/,
    );
    expect(() =>
      getJwtConfig({ NODE_ENV: 'production', JWT_SECRET: '   ' }),
    ).toThrow(/nao configurado/);
  });

  it('rejeita placeholder e segredo curto em producao', () => {
    expect(() =>
      getJwtConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'x-change-me-x-aaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    ).toThrow(/placeholder/);
    expect(() =>
      getJwtConfig({ NODE_ENV: 'production', JWT_SECRET: 'curto' }),
    ).toThrow(/32 caracteres/);
  });

  it('aceita segredo forte em producao', () => {
    const secret = 'a'.repeat(40);
    expect(
      getJwtConfig({ NODE_ENV: 'production', JWT_SECRET: secret }).secret,
    ).toBe(secret);
  });
});

describe('getHsmDeliveryDbConfig', () => {
  it('retorna null quando falta host, banco ou usuario', () => {
    expect(getHsmDeliveryDbConfig({})).toBeNull();
    expect(
      getHsmDeliveryDbConfig({ MYSQL_HOST: 'h', MYSQL_DATABASE: 'd' }),
    ).toBeNull();
    expect(
      getHsmDeliveryDbConfig({
        MYSQL_HOST: ' ',
        MYSQL_DATABASE: 'd',
        MYSQL_USER: 'u',
      }),
    ).toBeNull();
  });

  it('monta a configuracao com porta padrao e senha vazia', () => {
    expect(
      getHsmDeliveryDbConfig({
        MYSQL_HOST: ' host ',
        MYSQL_DATABASE: 'db',
        MYSQL_USER: 'user',
      }),
    ).toEqual({
      host: 'host',
      port: 3306,
      database: 'db',
      user: 'user',
      password: '',
    });
  });

  it('usa a porta informada e cai para 3306 se invalida', () => {
    const env = { MYSQL_HOST: 'h', MYSQL_DATABASE: 'd', MYSQL_USER: 'u' };
    expect(getHsmDeliveryDbConfig({ ...env, MYSQL_PORT: '3307' })?.port).toBe(
      3307,
    );
    expect(getHsmDeliveryDbConfig({ ...env, MYSQL_PORT: 'abc' })?.port).toBe(
      3306,
    );
    expect(getHsmDeliveryDbConfig({ ...env, MYSQL_PORT: '-1' })?.port).toBe(
      3306,
    );
  });
});

describe('payment-promise utils', () => {
  const now = new Date('2026-06-10T10:00:00.000Z');

  it('resolve o status alvo de cada acao', () => {
    expect(resolvePaymentPromiseTargetStatus('FULFILLED')).toBe('FULFILLED');
    expect(resolvePaymentPromiseTargetStatus('BROKEN')).toBe('BROKEN');
    expect(resolvePaymentPromiseTargetStatus('CANCELLED')).toBe('CANCELLED');
  });

  it('monta o update com o carimbo de data correto', () => {
    expect(buildPaymentPromiseStatusUpdateData('FULFILLED', now)).toEqual({
      status: 'FULFILLED',
      fulfilledAt: now,
    });
    expect(buildPaymentPromiseStatusUpdateData('BROKEN', now)).toEqual({
      status: 'BROKEN',
      brokenAt: now,
    });
    expect(buildPaymentPromiseStatusUpdateData('CANCELLED', now)).toEqual({
      status: 'CANCELLED',
      cancelledAt: now,
    });
  });

  it('mescla observacoes preservando o historico', () => {
    expect(mergePaymentPromiseNotes('antiga', undefined)).toBe('antiga');
    expect(mergePaymentPromiseNotes(null, '   ')).toBeNull();
    expect(mergePaymentPromiseNotes(null, ' nova ')).toBe('nova');
    expect(mergePaymentPromiseNotes('  ', 'nova')).toBe('nova');
    expect(mergePaymentPromiseNotes('antiga', ' nova ')).toBe('antiga\nnova');
  });

  it('mapeia a promessa para a resposta da API', () => {
    const promise = {
      id: 'p1',
      collectionCaseId: 'c1',
      status: 'FULFILLED',
      promisedAmount: new Prisma.Decimal('150.5'),
      promisedDate: new Date('2026-06-15T00:00:00.000Z'),
      notes: null,
      fulfilledAt: new Date('2026-06-16T00:00:00.000Z'),
      brokenAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    } as unknown as PaymentPromise;

    const response = mapPaymentPromiseToResponse(promise, 'usr_1');
    expect(response.promisedAmount).toBe('150.50');
    expect(response.fulfilledAt).toBe('2026-06-16T00:00:00.000Z');
    expect(response.brokenAt).toBeNull();
    expect(response.createdByUserId).toBe('usr_1');
    expect(mapPaymentPromiseToResponse(promise).createdByUserId).toBeNull();
  });
});

describe('revert-cancellation utils', () => {
  it('so permite reverter casos na esteira de cancelamento', () => {
    expect(canRevertCancellation('ELIGIBLE_FOR_CANCELLATION')).toBe(true);
    expect(canRevertCancellation('CANCELLATION_IN_PROGRESS')).toBe(true);
    expect(canRevertCancellation('IN_COLLECTION')).toBe(false);
  });

  it('identifica processos de cancelamento ainda reversiveis', () => {
    expect(isReversibleCancellationProcess('PENDING')).toBe(true);
    expect(isReversibleCancellationProcess('AWAITING_PICKUP')).toBe(true);
    expect(isReversibleCancellationProcess('COMPLETED')).toBe(false);
  });
});
