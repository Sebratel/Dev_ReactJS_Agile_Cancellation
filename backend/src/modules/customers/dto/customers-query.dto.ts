import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const CUSTOMERS_SORT_FIELDS = [
  'name',
  'contractsCount',
  'openInvoicesCount',
  'overdueAmount',
  'totalOutstanding',
] as const;

export type CustomersSortBy = (typeof CUSTOMERS_SORT_FIELDS)[number];
export type CustomersSortDirection = 'asc' | 'desc';

export class CustomersQueryDto {
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
  limit?: number = 20;

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
  @IsIn(CUSTOMERS_SORT_FIELDS)
  sortBy?: CustomersSortBy;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: CustomersSortDirection;
}
