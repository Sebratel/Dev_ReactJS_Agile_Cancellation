import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePaymentPromiseDto } from '@/modules/collection-cases/dto/create-payment-promise.dto';

describe('CreatePaymentPromiseDto', () => {
  it('aceita payload valido', async () => {
    const dto = plainToInstance(CreatePaymentPromiseDto, {
      promisedAmount: 1500.5,
      promisedDate: '2026-07-01T00:00:00.000Z',
      notes: 'Cliente confirmou pagamento.',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejeita promisedAmount menor ou igual a zero', async () => {
    const dto = plainToInstance(CreatePaymentPromiseDto, {
      promisedAmount: 0,
      promisedDate: '2026-07-01T00:00:00.000Z',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'promisedAmount')).toBe(
      true,
    );
  });

  it('rejeita promisedDate invalida', async () => {
    const dto = plainToInstance(CreatePaymentPromiseDto, {
      promisedAmount: 100,
      promisedDate: 'data-invalida',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'promisedDate')).toBe(
      true,
    );
  });

  it('rejeita notes acima de 1000 caracteres', async () => {
    const dto = plainToInstance(CreatePaymentPromiseDto, {
      promisedAmount: 100,
      promisedDate: '2026-07-01T00:00:00.000Z',
      notes: 'a'.repeat(1001),
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'notes')).toBe(true);
  });
});
