import { AuditAction } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const AUDIT_LOG_CATEGORY_FILTERS = [
  'CONTACT',
  'PROMISE',
  'CANCELLATION',
  'ASSIGNMENT',
  'ACCESS',
  'EXPORT',
  'NOTE',
  'ADMIN',
  'MESSAGE',
] as const;

export type AuditLogCategoryFilter =
  (typeof AUDIT_LOG_CATEGORY_FILTERS)[number];

function toOptionalInt(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

export class AuditLogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(AUDIT_LOG_CATEGORY_FILTERS)
  category?: AuditLogCategoryFilter;
}
