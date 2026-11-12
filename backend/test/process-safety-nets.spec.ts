import { Logger } from '@nestjs/common';
import { registerProcessSafetyNets } from '@/common/utils/process-safety-nets';

describe('registerProcessSafetyNets', () => {
  it('registra handler de unhandledRejection que loga e nao lanca', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const handlers: Record<string, (reason: unknown) => void> = {};
    const target = {
      on: jest.fn((event: string, cb: (reason: unknown) => void) => {
        handlers[event] = cb;
        return target;
      }),
    } as unknown as Pick<NodeJS.Process, 'on'>;

    registerProcessSafetyNets(target);

    const handler = handlers['unhandledRejection'];
    expect(handler).toBeDefined();

    const p2034 = Object.assign(new Error('write conflict or a deadlock'), {
      code: 'P2034',
    });
    expect(() => handler?.(p2034)).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      'unhandledRejection capturada (processo mantido).',
      expect.stringContaining('write conflict'),
    );

    expect(() => handler?.('falha nao-Error')).not.toThrow();
    expect(errorSpy).toHaveBeenLastCalledWith(
      'unhandledRejection capturada (processo mantido).',
      'falha nao-Error',
    );
    errorSpy.mockRestore();
  });
});
