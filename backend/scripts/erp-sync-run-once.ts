import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ErpSyncService } from '@/modules/erp-sync/erp-sync.service';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const erpSyncService = app.get(ErpSyncService);
    await erpSyncService.runSync();
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
