import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class EnvValidationSchema {
  @IsOptional()
  @IsString()
  APP_NAME?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  PORT?: number;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  @IsOptional()
  @IsString()
  APP_TIMEZONE?: string;

  @IsOptional()
  @IsString()
  DATA_SOURCE_MODE?: string;

  @IsOptional()
  @IsString()
  PRISMA_AUTO_CONNECT?: string;

  @IsOptional()
  @IsString()
  JWT_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_WORKSPACE_DOMAIN?: string;

  @IsOptional()
  @IsString()
  ELEVEN_MODE?: string;

  @IsOptional()
  @IsString()
  N8N_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  N8N_MATRIX_HSM_WEBHOOK_URL?: string;

  @IsOptional()
  @IsString()
  N8N_MATRIX_HSM_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  N8N_MATRIX_HSM_TIMEOUT_MS?: string;

  @IsOptional()
  @IsString()
  ERP_SYNC_ENABLED?: string;

  @IsOptional()
  @IsString()
  ERP_DB_HOST?: string;

  @IsOptional()
  @IsString()
  ERP_DB_PORT?: string;

  @IsOptional()
  @IsString()
  ERP_DB_NAME?: string;

  @IsOptional()
  @IsString()
  ERP_DB_USER?: string;

  @IsOptional()
  @IsString()
  ERP_DB_PASSWORD?: string;
}
