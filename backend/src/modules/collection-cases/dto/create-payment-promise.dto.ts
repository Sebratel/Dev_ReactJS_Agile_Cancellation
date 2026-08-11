import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function toNumber(value: unknown) {
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }

  return value;
}

export class CreatePaymentPromiseDto {
  @Transform(({ value }) => toNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  promisedAmount!: number;

  @IsDateString()
  promisedDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
