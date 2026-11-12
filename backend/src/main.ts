import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from '@/app.module';
import { getAppConfig } from '@/config/app.config';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { TimeoutInterceptor } from '@/common/interceptors/timeout.interceptor';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';

// Rede de seguranca: uma rejeicao nao tratada (ex.: conflito de escrita do banco em
// tarefa em segundo plano) derrubaria o processo no Node 22 e poria a API em loop de restart.
function registerProcessSafetyNets() {
  const logger = new Logger('Process');
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error(
      'unhandledRejection capturada (processo mantido).',
      reason instanceof Error ? reason.stack : String(reason),
    );
  });
}

async function bootstrap() {
  registerProcessSafetyNets();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const appConfig = getAppConfig();

  // Atras do nginx: usa X-Forwarded-For para req.ip (limite por IP do Throttler).
  app.set('trust proxy', appConfig.trustProxy);
  app.use(helmet());
  app.enableCors({
    origin: appConfig.corsOrigin,
    credentials: false,
  });
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TimeoutInterceptor());
  app.enableShutdownHooks();

  await app.listen(appConfig.port);
}

void bootstrap();
