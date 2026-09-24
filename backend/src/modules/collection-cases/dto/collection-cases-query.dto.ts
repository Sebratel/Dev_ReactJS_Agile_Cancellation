import {
  CollectionStatus,
  ContractStatus,
  PaymentPromiseStatus,
  Priority,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const COLLECTION_CASES_SORT_BY = [
  'daysOverdue',
  'totalOutstanding',
  'firstOverdueDate',
  'slaDueAt',
  'createdAt',
  'updatedAt',
] as const;

export const COLLECTION_CASES_SORT_DIRECTION = ['asc', 'desc'] as const;

export const COLLECTION_CASES_SLA_STATUS = [
  'overdue',
  'due_today',
  'no_sla',
  'ok',
] as const;

export const COLLECTION_CASES_INTERACTION_STATUS = [
  'none',
  'contacted',
  'not_contacted',
] as const;

export const COLLECTION_CASES_PROMISE_STATUS = [
  PaymentPromiseStatus.ACTIVE,
  PaymentPromiseStatus.FULFILLED,
  PaymentPromiseStatus.BROKEN,
  PaymentPromiseStatus.CANCELLED,
  PaymentPromiseStatus.EXPIRED,
] as const;

export type CollectionCasesSortBy = (typeof COLLECTION_CASES_SORT_BY)[number];
export type CollectionCasesSortDirection =
  (typeof COLLECTION_CASES_SORT_DIRECTION)[number];
export type CollectionCasesSlaStatus =
  (typeof COLLECTION_CASES_SLA_STATUS)[number];
export type CollectionCasesInteractionStatus =
  (typeof COLLECTION_CASES_INTERACTION_STATUS)[number];
export type CollectionCasesPromiseStatus =
  (typeof COLLECTION_CASES_PROMISE_STATUS)[number];

function toOptionalInt(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

function toOptionalFloat(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

function toOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
}

export class CollectionCasesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(CollectionStatus)
  status?: CollectionStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsEnum(ContractStatus)
  contractStatus?: ContractStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  search?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(0)
  daysOverdueMin?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(0)
  daysOverdueMax?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalFloat(value))
  @IsNumber()
  @Min(0)
  totalOutstandingMin?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalFloat(value))
  @IsNumber()
  @Min(0)
  totalOutstandingMax?: number;

  @IsOptional()
  @IsDateString()
  firstDueDate?: string;

  @IsOptional()
  @IsDateString()
  secondDueDate?: string;

  @IsOptional()
  @IsIn(COLLECTION_CASES_SLA_STATUS)
  slaStatus?: CollectionCasesSlaStatus;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  createdToday?: boolean;

  @IsOptional()
  @IsIn(COLLECTION_CASES_INTERACTION_STATUS)
  interactionStatus?: CollectionCasesInteractionStatus;

  @IsOptional()
  @IsIn(COLLECTION_CASES_PROMISE_STATUS)
  promiseStatus?: CollectionCasesPromiseStatus;

  @IsOptional()
  @IsIn(COLLECTION_CASES_SORT_BY)
  sortBy?: CollectionCasesSortBy;

  @IsOptional()
  @IsIn(COLLECTION_CASES_SORT_DIRECTION)
  sortDirection?: CollectionCasesSortDirection;
}
