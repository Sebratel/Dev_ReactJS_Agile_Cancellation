import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendToCancellationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
