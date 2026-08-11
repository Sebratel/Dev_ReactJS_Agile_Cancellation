import { Test } from '@nestjs/testing';
import { PrismaService } from '@/database/prisma/prisma.service';

describe('PrismaService', () => {
  const originalAutoConnect = process.env.PRISMA_AUTO_CONNECT;

  afterEach(() => {
    process.env.PRISMA_AUTO_CONNECT = originalAutoConnect;
  });

  it('nao conecta ao banco quando PRISMA_AUTO_CONNECT=false', async () => {
    process.env.PRISMA_AUTO_CONNECT = 'false';

    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    const prismaService = moduleRef.get(PrismaService);
    const connectSpy = jest
      .spyOn(prismaService, '$connect')
      .mockResolvedValue(undefined);
    const disconnectSpy = jest
      .spyOn(prismaService, '$disconnect')
      .mockResolvedValue(undefined);

    await prismaService.onModuleInit();
    await prismaService.onModuleDestroy();

    expect(connectSpy).not.toHaveBeenCalled();
    expect(disconnectSpy).not.toHaveBeenCalled();

    connectSpy.mockRestore();
    disconnectSpy.mockRestore();
    await moduleRef.close();
  });

  it('conecta e desconecta quando PRISMA_AUTO_CONNECT nao esta desabilitado', async () => {
    delete process.env.PRISMA_AUTO_CONNECT;

    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    const prismaService = moduleRef.get(PrismaService);
    const connectSpy = jest
      .spyOn(prismaService, '$connect')
      .mockResolvedValue(undefined);
    const disconnectSpy = jest
      .spyOn(prismaService, '$disconnect')
      .mockResolvedValue(undefined);

    await prismaService.onModuleInit();
    await prismaService.onModuleDestroy();

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(disconnectSpy).toHaveBeenCalledTimes(1);

    connectSpy.mockRestore();
    disconnectSpy.mockRestore();
    await moduleRef.close();
  });
});
