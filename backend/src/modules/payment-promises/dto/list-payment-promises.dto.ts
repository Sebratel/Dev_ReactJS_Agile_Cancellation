import { IsIn, IsOptional, IsString, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export const PROMISE_CASE_SITUATIONS = [
  'PAID',
  'RECOVERED',
  'PAYMENT_MADE',
  'IN_COLLECTION',
  'CANCELLATION',
  'CLOSED',
] as const;

export type PromiseCaseSituation = (typeof PROMISE_CASE_SITUATIONS)[number];

export class ListPaymentPromisesDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'FULFILLED', 'BROKEN', 'CANCELLED'])
  status?: string;

  // Desfecho do caso da promessa (o cliente pagou? foi retido?).
  @IsOptional()
  @IsIn(PROMISE_CASE_SITUATIONS)
  caseSituation?: PromiseCaseSituation;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
