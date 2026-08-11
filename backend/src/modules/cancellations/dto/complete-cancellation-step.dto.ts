import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteCancellationStepDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalProtocol?: string;

  @IsOptional()
  @IsISO8601()
  completedAt?: string;
}
