import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SendToCancellationDto } from '@/modules/collection-cases/dto/send-to-cancellation.dto';

describe('SendToCancellationDto', () => {
  it('aceita payload valido', async () => {
    const dto = plainToInstance(SendToCancellationDto, {
      reason: 'Cliente recusou acordo.',
      notes: 'Encaminhado apos tentativas.',
      assignedUserId: 'user-cancellation',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejeita quando falta o agente de cancelamento (assignedUserId)', async () => {
    const dto = plainToInstance(SendToCancellationDto, {
      reason: 'Cliente recusou acordo.',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'assignedUserId')).toBe(
      true,
    );
  });

  it('rejeita reason vazio', async () => {
    const dto = plainToInstance(SendToCancellationDto, {
      reason: '',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'reason')).toBe(true);
  });

  it('rejeita reason acima de 500 caracteres', async () => {
    const dto = plainToInstance(SendToCancellationDto, {
      reason: 'a'.repeat(501),
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'reason')).toBe(true);
  });
});
