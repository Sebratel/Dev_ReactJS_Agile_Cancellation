import { AttemptChannel, AttemptResult } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCollectionAttemptDto {
  @IsEnum(AttemptChannel)
  channel!: AttemptChannel;

  @IsEnum(AttemptResult)
  result!: AttemptResult;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  nextContactAt?: string;
}
