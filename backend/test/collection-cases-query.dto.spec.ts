import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CollectionCasesQueryDto } from '@/modules/collection-cases/dto/collection-cases-query.dto';

describe('CollectionCasesQueryDto', () => {
  it('aplica defaults de page e limit', async () => {
    const dto = plainToInstance(CollectionCasesQueryDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('rejeita limit acima de 100', async () => {
    const dto = plainToInstance(CollectionCasesQueryDto, { limit: 101 });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('rejeita sortBy invalido', async () => {
    const dto = plainToInstance(CollectionCasesQueryDto, {
      sortBy: 'invalidField',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'sortBy')).toBe(true);
  });
});
