import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateElevenRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
