import { IsIn, IsOptional, IsString, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ListPaymentPromisesDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'FULFILLED', 'BROKEN', 'CANCELLED'])
  status?: string;

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
