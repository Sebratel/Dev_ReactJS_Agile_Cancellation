import { HttpStatus } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { CustomersService } from '@/modules/customers/customers.service';
import { CustomersMockRepository } from '@/modules/customers/repositories/customers-mock.repository';

describe('CustomersService (mock)', () => {
  let service: CustomersService;

  beforeEach(() => {
    service = new CustomersService(new CustomersMockRepository());
  });

  it('lista clientes paginados com agregados', async () => {
    const response = await service.list({ page: 1, limit: 20 });

    expect(response.data.items.length).toBeGreaterThan(0);
    const horizonte = response.data.items.find(
      (item) => item.id === 'cus_0001',
    );
    expect(horizonte?.contractsCount).toBe(1);
    expect(horizonte?.openInvoicesCount).toBe(1);
    expect(horizonte?.totalOutstanding).toBe('12890.55');
  });

  it('filtra clientes por busca', async () => {
    const response = await service.list({
      page: 1,
      limit: 20,
      search: 'padaria',
    });

    expect(response.data.items).toHaveLength(1);
    expect(response.data.items[0]?.id).toBe('cus_0002');
  });

  it('retorna detalhe com historico de pagamentos ordenado', async () => {
    const response = await service.getById('cus_0001');

    expect(response.data.name).toBe('Construtora Horizonte');
    expect(response.data.contracts).toHaveLength(1);
    expect(response.data.paymentHistory).toHaveLength(2);
    expect(response.data.paymentHistory[0]?.id).toBe('inv_0001');
    expect(response.data.totalOutstanding).toBe('12890.55');
  });

  it('retorna 404 para cliente inexistente', async () => {
    await expect(service.getById('cus_inexistente')).rejects.toBeInstanceOf(
      AppException,
    );
    await expect(service.getById('cus_inexistente')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });
});
