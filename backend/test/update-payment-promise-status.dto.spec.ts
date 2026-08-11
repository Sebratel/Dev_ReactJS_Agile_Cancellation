import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdatePaymentPromiseStatusDto } from '@/modules/collection-cases/dto/update-payment-promise-status.dto';

describe('UpdatePaymentPromiseStatusDto', () => {
  it('aceita payload vazio', async () => {
    const dto = plainToInstance(UpdatePaymentPromiseStatusDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('aceita notes validas', async () => {
    const dto = plainToInstance(UpdatePaymentPromiseStatusDto, {
      notes: 'Pagamento confirmado via PIX.',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejeita notes acima de 1000 caracteres', async () => {
    const dto = plainToInstance(UpdatePaymentPromiseStatusDto, {
      notes: 'a'.repeat(1001),
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'notes')).toBe(true);
  });
});
