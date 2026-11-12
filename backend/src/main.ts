import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from '@/app.module';
import { getAppConfig } from '@/config/app.config';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { TimeoutInterceptor } from '@/common/interceptors/timeout.interceptor';
import { registerProcessSafetyNets } from '@/common/utils/process-safety-nets';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';

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
