import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCollectionAttemptDto } from '@/modules/collection-cases/dto/create-collection-attempt.dto';

describe('CreateCollectionAttemptDto', () => {
  it('aceita payload valido', async () => {
    const dto = plainToInstance(CreateCollectionAttemptDto, {
      channel: 'PHONE',
      result: 'CONTACTED',
      notes: 'Cliente atendeu.',
      nextContactAt: '2026-06-10T10:00:00.000Z',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejeita channel invalido', async () => {
    const dto = plainToInstance(CreateCollectionAttemptDto, {
      channel: 'INVALID',
      result: 'CONTACTED',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'channel')).toBe(true);
  });

  it('rejeita notes acima de 1000 caracteres', async () => {
    const dto = plainToInstance(CreateCollectionAttemptDto, {
      channel: 'PHONE',
      result: 'NO_ANSWER',
      notes: 'a'.repeat(1001),
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'notes')).toBe(true);
  });
});
