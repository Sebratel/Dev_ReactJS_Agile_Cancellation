import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from '@/app.module';
import { getAppConfig } from '@/config/app.config';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { TimeoutInterceptor } from '@/common/interceptors/timeout.interceptor';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const appConfig = getAppConfig();

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
